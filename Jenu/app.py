import os
import re
import secrets
import uuid
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

import db
import ollama_client

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

CORS(
    app,
    supports_credentials=True,
    origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()],
)


def utc_now_iso() -> str:
    return db.utc_now_iso()


def public_user(user: dict) -> dict:
    expiry = db.password_expiry_status(user)
    return {
        "id": user["id"],
        "username": user["username"],
        "created_at": user.get("created_at"),
        "last_logged_in": user.get("last_logged_in"),
        "is_admin": user.get("is_admin", False),
        **db.password_expiry_public(expiry),
    }


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        user = db.find_user_by_id(session["user_id"])
        if not user or not user.get("is_admin"):
            return jsonify({"error": "Admin access required"}), 403
        return view(*args, **kwargs)

    return wrapped


def ensure_default_admin() -> None:
    db.ensure_default_admin()


def score_password(password: str) -> tuple[int, str, float]:
    score = 0
    if len(password) >= 8:
        score += 1
    if re.search(r"[A-Z]", password):
        score += 1
    if re.search(r"[a-z]", password):
        score += 1
    if re.search(r"[0-9]", password):
        score += 1
    if re.search(r"[^A-Za-z0-9]", password):
        score += 1

    if score <= 1:
        strength = "Very Weak"
    elif score == 2:
        strength = "Weak"
    elif score == 3:
        strength = "Moderate"
    elif score == 4:
        strength = "Strong"
    else:
        strength = "Very Strong"

    crack_seconds = max(0.05, (6 - score) * 0.65)
    return score, strength, crack_seconds


def extract_personal_info(text: str, existing: dict | None = None) -> dict:
    info = dict(existing or {})
    lower = text.lower()

    year_match = re.search(r"\b(19|20)\d{2}\b", text)
    if year_match:
        info["birth"] = year_match.group(0)

    school_match = re.search(r"school\s+([a-zA-Z]+)", text, re.I)
    if school_match:
        info["school"] = school_match.group(1)

    pet_match = re.search(r"pet(?:\s+name)?[:\s,]+([a-zA-Z]+)", text, re.I)
    if pet_match:
        info["pet"] = pet_match.group(1)

    parts = [p.strip() for p in re.split(r"[,;]+", text) if p.strip()]
    for part in parts:
        part_lower = part.lower()
        if re.fullmatch(r"(19|20)\d{2}", part):
            info["birth"] = part
            continue
        if part_lower.startswith("school "):
            info["school"] = part.split(None, 1)[1]
            continue
        if "pet" in part_lower:
            words = re.findall(r"[a-zA-Z]+", part)
            for word in words:
                if word.lower() not in ("pet", "name", "my", "is"):
                    info["pet"] = word
                    break
            continue
        if not info.get("name") and part_lower not in ("pet name", "school"):
            name_word = re.findall(r"[a-zA-Z]+", part)
            if name_word and name_word[0].lower() not in ("pet", "name", "school", "my", "born"):
                if not info.get("pet"):
                    info["pet"] = name_word[0]
                info.setdefault("name", name_word[0])

    return info


def build_personal_guesses(info: dict) -> list[str]:
    name = (info.get("name") or "").replace(" ", "")
    pet = info.get("pet") or ""
    birth = info.get("birth") or info.get("birthday") or ""
    school = (info.get("school") or "").replace(" ", "")

    guesses = []
    if pet and birth:
        guesses.append(f"{pet}{birth}")
    if name and birth:
        guesses.append(f"{name}{birth}")
    if pet:
        guesses.append(f"{pet}@123")
    if school and birth:
        guesses.append(f"{school}{birth[-2:] if birth else ''}")
    if name:
        guesses.append(f"{name.capitalize()}123!")
    if birth:
        guesses.append(birth)

    # dedupe while preserving order
    seen = set()
    unique = []
    for guess in guesses:
        if guess and guess not in seen:
            seen.add(guess)
            unique.append(guess)
    return unique[:6]


def process_demo_state(message: str, state: dict) -> dict:
    """Rule-based demo engine: state transitions, UI actions, fallback reply."""
    text = (message or "").strip()
    lower = text.lower()
    stage = state.get("stage", "idle")
    actions: list[dict] = []
    reply = ""
    ai_context = ""

    greetings = ("hi", "hello", "hey", "start", "help")
    if stage == "idle" and any(lower == g or lower.startswith(g + " ") for g in greetings):
        stage = "awaiting_password"
        reply = (
            "I'm TriCipher — your adversarial security coach. "
            "Drop a password you'd use (or a test one) and I'll show you how fast a real attacker breaks it."
        )
        ai_context = "User greeted you. Welcome them and ask for a test password to analyze."

    elif stage == "awaiting_password" and text:
        score, strength, crack_seconds = score_password(text)
        state["last_password"] = text
        state["password_score"] = score
        state["password_strength"] = strength
        state["crack_seconds"] = crack_seconds
        stage = "offered_simulation"
        reply = (
            f"Analyzing… A hacker AI could crack **{text}** in **{crack_seconds:.2f} seconds** "
            f"(strength: {strength}, score {score * 20}/100). "
            "Want me to simulate the brute-force attack on screen?"
        )
        ai_context = (
            f"Password analyzed. Strength: {strength}, score {score * 20}/100, "
            f"estimated crack time {crack_seconds:.2f} seconds. "
            "Ask if they want the brute-force simulation on screen."
        )
        actions.append(
            {
                "type": "highlight_password",
                "password": text,
                "score": score,
                "strength": strength,
                "crack_seconds": crack_seconds,
            }
        )

    elif stage == "offered_simulation":
        if lower in ("yes", "y", "yeah", "sure", "ok", "okay", "simulate", "do it", "show me"):
            stage = "after_simulation"
            reply = (
                "Launching brute-force simulation now. Watch the terminal — "
                "this is exactly how credential stuffing and dictionary attacks feel in the wild."
            )
            ai_context = "User agreed. Brute-force simulation is launching in the terminal panel."
            actions.append({"type": "run_bruteforce", "password": state.get("last_password", "")})
        elif lower in ("no", "n", "nah", "skip"):
            stage = "personal_intro"
            reply = (
                "Smart to pause. Let's try something scarier: personal-info attacks. "
                "What's your birthday, pet name, or school? (Use fake info if you want — I'll still demonstrate the risk.)"
            )
            ai_context = "User skipped brute force. Ask for birthday, pet name, or school (fake data OK)."
        else:
            reply = 'Reply **yes** to run the brute-force demo, or **no** to try the personal-info attack instead.'
            ai_context = "Waiting for yes/no on brute-force simulation."

    elif stage == "after_simulation":
        if lower in ("yes", "y", "yeah", "sure", "ok", "okay", "next", "continue"):
            stage = "personal_intro"
            reply = (
                "Brute force is fast on weak passwords. Now for the personal-info angle — "
                "tell me your birthday, pet name, or school (fake data works fine for the demo)."
            )
            ai_context = "Brute force demo finished. Move to personal-info attack demo."
        else:
            strength = state.get("password_strength", "Weak")
            crack = state.get("crack_seconds", 1.0)
            reply = (
                f"That simulation used dictionary + pattern rules. Your password rated **{strength}** "
                f"and fell in ~**{crack:.2f}s**. "
                "Type **next** to see how attackers abuse birthdays and pet names."
            )
            ai_context = f"Password was {strength}, cracked in ~{crack:.2f}s. Prompt user to type next."

    elif stage == "personal_intro" and text:
        info = extract_personal_info(text, state.get("personal_info"))
        guesses = build_personal_guesses(info)
        if len(guesses) >= 2:
            stage = "personal_done"
            top_guess = guesses[0]
            reply = (
                f"I guessed your password is **`{top_guess}`** in **2 tries**. "
                "Never use personal info in passwords — attackers scrape social media and breach dumps for exactly this."
            )
            ai_context = (
                f"Social attack demo: guessed password `{top_guess}` in 2 tries. "
                f"Other guesses: {', '.join(guesses[:4])}. Warn against personal info in passwords."
            )
            actions.append({"type": "run_social_attack", "info": info, "guesses": guesses})
        else:
            stage = "personal_collecting"
            reply = (
                "Got it. Give me one more detail — pet name, birth year, or school — "
                "so I can show how quickly I can stitch a guess together."
            )
            ai_context = "Need one more personal detail to demonstrate password guessing."
        state["personal_info"] = info

    elif stage == "personal_collecting" and text:
        info = extract_personal_info(text, state.get("personal_info"))
        guesses = build_personal_guesses(info)
        stage = "personal_done"
        top_guess = guesses[0] if guesses else "YourName123"
        tries = min(2, len(guesses)) if guesses else 2
        reply = (
            f"I guessed your password is **`{top_guess}`** in **{tries} tries**. "
            "Never use personal info in passwords."
        )
        ai_context = f"Guessed `{top_guess}` in {tries} tries. Social attack panel updated."
        actions.append({"type": "run_social_attack", "info": info, "guesses": guesses or [top_guess]})
        state["personal_info"] = info

    elif stage == "personal_done":
        if "password" in lower or "generate" in lower or "strong" in lower:
            stage = "idle"
            reply = "Generating a strong password for you now — check the generator panel on the right."
            ai_context = "Trigger password generator panel."
            actions.append({"type": "generate_password"})
        elif "again" in lower or "restart" in lower or "reset" in lower:
            stage = "awaiting_password"
            state.pop("personal_info", None)
            state.pop("last_password", None)
            reply = "Reset. Enter another password and we'll run the attack demos again."
            ai_context = "Demo reset. Ask for a new test password."
        else:
            reply = (
                "You've seen brute force and social guessing. "
                "Say **generate** for a strong password, or **again** to restart the demo."
            )
            ai_context = "Offer generate or restart."

    elif text:
        score, strength, crack_seconds = score_password(text)
        if len(text) >= 4 and score <= 3 and " " not in text.strip():
            state["last_password"] = text
            state["password_score"] = score
            state["password_strength"] = strength
            state["crack_seconds"] = crack_seconds
            stage = "offered_simulation"
            reply = (
                f"A hacker AI could crack **{text}** in **{crack_seconds:.2f} seconds**. "
                "Want me to simulate it?"
            )
            ai_context = (
                f"Password `{text}`: {strength}, crack time {crack_seconds:.2f}s. Offer simulation."
            )
            actions.append(
                {
                    "type": "highlight_password",
                    "password": text,
                    "score": score,
                    "strength": strength,
                    "crack_seconds": crack_seconds,
                }
            )
        else:
            reply = (
                "I'm TriCipher. Try sending a password to analyze, say **hi** to start the guided demo, "
                "or ask about **strong passwords**."
            )
            ai_context = "General password security question — answer helpfully and suggest the guided demo."
    else:
        reply = "Send a message or type **hi** to begin the security demo."
        ai_context = "Prompt user to start."

    state["stage"] = stage
    return {
        "reply": reply,
        "ai_context": ai_context,
        "state": state,
        "actions": actions,
    }


def chatbot_reply(message: str, state: dict, history: list[dict] | None = None) -> dict:
    """Demo engine + optional Ollama for natural language."""
    demo = process_demo_state(message, state)
    reply = demo["reply"]
    ollama_used = False

    if ollama_client.is_enabled():
        ollama_reply = ollama_client.chat(
            message,
            history or [],
            stage=demo["state"].get("stage", "idle"),
            demo_context=demo["ai_context"],
            fallback_reply=demo["reply"],
        )
        if ollama_reply:
            reply = ollama_reply
            ollama_used = True

    return {
        "reply": reply,
        "state": demo["state"],
        "actions": demo["actions"],
        "ollama": ollama_used,
        "ollama_available": ollama_client.check_available(),
    }


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = db.find_user_by_username(username)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    db.update_user_by_id(user["id"], {"last_logged_in": utc_now_iso()})
    user = db.find_user_by_id(user["id"])

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["is_admin"] = user.get("is_admin", False)

    password_reminder = db.password_expiry_public(db.password_expiry_status(user))
    session["password_reminder"] = password_reminder

    return jsonify({"user": public_user(user), "password_reminder": password_reminder})


@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if db.find_user_by_username(username):
        return jsonify({"error": "Username already exists"}), 400

    now = utc_now_iso()
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": generate_password_hash(password),
        "created_at": now,
        "password_changed_at": now,
        "last_logged_in": None,
        "is_admin": False,
    }
    db.create_user(user)
    return jsonify({"user": public_user(user)}), 201


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/users", methods=["GET"])
@admin_required
def list_users():
    return jsonify({"users": [public_user(u) for u in db.list_users()]})


@app.route("/api/users/<user_id>", methods=["GET"])
@login_required
def get_user(user_id):
    current = db.find_user_by_id(session["user_id"])
    if not current:
        return jsonify({"error": "Not found"}), 404
    if current["id"] != user_id and not current.get("is_admin"):
        return jsonify({"error": "Forbidden"}), 403
    user = db.find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"user": public_user(user)})


@app.route("/api/users/<user_id>", methods=["PUT"])
@login_required
def update_user(user_id):
    current = db.find_user_by_id(session["user_id"])
    if not current:
        return jsonify({"error": "Not found"}), 404
    if current["id"] != user_id and not current.get("is_admin"):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    user = db.find_user_by_id(user_id)
    if not user:
        return jsonify({"error": "Not found"}), 404

    updates: dict = {}

    if "username" in data:
        new_name = data["username"].strip()
        if len(new_name) < 3:
            return jsonify({"error": "Username must be at least 3 characters"}), 400
        existing = db.find_user_by_username(new_name)
        if existing and existing["id"] != user_id:
            return jsonify({"error": "Username already exists"}), 400
        updates["username"] = new_name

    if "password" in data and data["password"]:
        if len(data["password"]) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        updates["password_hash"] = generate_password_hash(data["password"])
        updates["password_changed_at"] = utc_now_iso()

    if current.get("is_admin") and "is_admin" in data:
        updates["is_admin"] = bool(data["is_admin"])

    if not updates:
        return jsonify({"user": public_user(user)})

    updated = db.update_user_by_id(user_id, updates)
    if not updated:
        return jsonify({"error": "Not found"}), 404

    if session.get("user_id") == user_id:
        session["username"] = updated["username"]
        session["is_admin"] = updated.get("is_admin", False)
        session["password_reminder"] = db.password_expiry_public(db.password_expiry_status(updated))

    return jsonify({"user": public_user(updated)})


@app.route("/api/account/change-password", methods=["POST"])
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    confirm_password = data.get("confirm_password") or new_password

    user = db.find_user_by_id(session["user_id"])
    if not user:
        return jsonify({"error": "Not found"}), 404

    if not current_password:
        return jsonify({"error": "Current password is required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match"}), 400
    if not check_password_hash(user["password_hash"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 400
    if check_password_hash(user["password_hash"], new_password):
        return jsonify({"error": "New password must be different from your current password"}), 400

    updated = db.update_user_by_id(
        user["id"],
        {
            "password_hash": generate_password_hash(new_password),
            "password_changed_at": utc_now_iso(),
        },
    )
    if not updated:
        return jsonify({"error": "Update failed"}), 500

    session["password_reminder"] = db.password_expiry_public(db.password_expiry_status(updated))
    return jsonify({"ok": True, "user": public_user(updated)})


@app.route("/api/users/<user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    target = db.find_user_by_id(user_id)
    if not target:
        return jsonify({"error": "Not found"}), 404

    if target.get("is_admin") and db.count_admins() <= 1:
        return jsonify({"error": "Cannot delete the only admin account"}), 400

    db.delete_user_by_id(user_id)

    if session.get("user_id") == user_id:
        session.clear()

    return jsonify({"ok": True})


@app.route("/api/chat/status", methods=["GET"])
@login_required
def chat_status():
    available = ollama_client.check_available()
    return jsonify(
        {
            "enabled": ollama_client.is_enabled(),
            "available": available,
            "model": ollama_client.OLLAMA_MODEL,
            "base_url": ollama_client.OLLAMA_BASE_URL,
            "models": ollama_client.list_models() if available else [],
        }
    )


@app.route("/api/chat", methods=["POST"])
@login_required
def chat():
    payload = request.get_json(silent=True) or {}
    message = payload.get("message", "")
    state = payload.get("state") or session.get("chat_state") or {}
    history = session.get("chat_history") or []

    result = chatbot_reply(message, state, history)

    if message.strip():
        history.append({"role": "user", "content": message.strip()})
        history.append({"role": "assistant", "content": result["reply"]})
        session["chat_history"] = history[-24:]

    session["chat_state"] = result["state"]
    return jsonify(result)


@app.route("/api/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify({"user": None, "password_reminder": None})
    user = db.find_user_by_id(session["user_id"])
    if not user:
        session.clear()
        return jsonify({"user": None, "password_reminder": None})
    return jsonify(
        {
            "user": public_user(user),
            "password_reminder": db.password_expiry_public(db.password_expiry_status(user)),
        }
    )


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api"):
        return jsonify({"error": "Not found"}), 404
    if not FRONTEND_DIST.exists():
        return jsonify(
            {
                "error": "Frontend not built",
                "hint": "Run: cd frontend && npm install && npm run build",
                "dev_hint": "Or run Flask + `npm run dev` in frontend/ with Vite proxy",
            }
        ), 503
    target = FRONTEND_DIST / path
    if path and target.is_file():
        return send_from_directory(FRONTEND_DIST, path)
    return send_from_directory(FRONTEND_DIST, "index.html")


ensure_default_admin()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
