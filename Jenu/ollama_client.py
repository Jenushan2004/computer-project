"""Local Ollama API client (no extra dependencies — uses urllib)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2")
OLLAMA_ENABLED = os.environ.get("OLLAMA_ENABLED", "true").lower() in ("1", "true", "yes")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "90"))

SYSTEM_PROMPT = """You are TriCipher — an adversarial cybersecurity coach for password education.

Your job:
- Teach password security through engaging, slightly dramatic (but clearly simulated) demos
- Guide users: analyze passwords → brute-force demo → personal-info attacks → strong passwords
- Be concise (under 130 words unless explaining something important)
- Use markdown lightly: **bold**, `code`, bullet lists when helpful
- Never claim you perform real hacking or access real breach data — everything is educational simulation
- Never ask users to share real passwords they use on important accounts; test passwords are fine

When demo context is provided, you MUST include the key facts (crack time, guessed password, scores) accurately.
Encourage users to watch the on-screen panels when simulations run."""


def is_enabled() -> bool:
    return OLLAMA_ENABLED


def _request(method: str, path: str, payload: dict | None = None) -> dict | None:
    url = f"{OLLAMA_BASE_URL}{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None


def check_available() -> bool:
    if not OLLAMA_ENABLED:
        return False
    result = _request("GET", "/api/tags")
    return result is not None and "models" in result


def list_models() -> list[str]:
    result = _request("GET", "/api/tags")
    if not result:
        return []
    return [m.get("name", "") for m in result.get("models", []) if m.get("name")]


def chat(
    user_message: str,
    history: list[dict],
    *,
    stage: str,
    demo_context: str,
    fallback_reply: str,
) -> str | None:
    """Return Ollama-generated reply, or None if unavailable."""
    if not OLLAMA_ENABLED:
        return None

    context_block = f"Demo stage: {stage}\n"
    if demo_context:
        context_block += f"Demo update (include these facts):\n{demo_context}\n"
    context_block += f"\nFallback reference (same facts, rephrase naturally):\n{fallback_reply}"

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history[-16:])
    messages.append(
        {
            "role": "user",
            "content": f"{context_block}\n\nUser message: {user_message}",
        }
    )

    result = _request(
        "POST",
        "/api/chat",
        {
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.7, "num_predict": 280},
        },
    )
    if not result:
        return None

    content = (result.get("message") or {}).get("content", "").strip()
    return content or None
