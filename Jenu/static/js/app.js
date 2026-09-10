let chatState = {};

function formatBotMessage(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function appendMessage(role, text) {
  const box = document.getElementById("chatMessages");
  const el = document.createElement("div");
  el.className = `chat-bubble ${role}`;
  el.innerHTML = role === "bot" ? formatBotMessage(text) : text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateMetrics(score, strength) {
  const fear = 100 - score * 20;
  document.getElementById("strength").textContent = `${score * 20}/100 (${strength})`;
  document.getElementById("strength").className = `metric-value ${score >= 4 ? "safe" : "danger"}`;
  document.getElementById("fear").textContent = `${fear}%`;
}

function analyzePassword(forcedPw, crackOverride) {
  const pw = forcedPw || document.getElementById("pw").value;
  if (!pw) return;

  document.getElementById("pw").value = pw;

  const score = scorePassword(pw);
  let strength = "Weak";
  if (score >= 3) strength = "Moderate";
  if (score >= 4) strength = "Strong";
  if (score >= 5) strength = "Very Strong";

  updateMetrics(score, strength);

  const fear = 100 - score * 20;
  const term = document.getElementById("terminal");
  term.innerHTML = "";
  const crackLabel = document.getElementById("crackLabel");
  if (crackLabel) crackLabel.textContent = "0%";
  document.getElementById("bar").style.width = "0%";

  const msgs = [
    "[ Hacker AI Activated ]",
    "Initializing GPU hash cluster...",
    "Searching 12B leaked passwords...",
    "Trying dictionary attack (rockyou.txt)...",
    "Testing keyboard patterns (qwerty, 123456)...",
    "Adding common suffixes (!, @123, 2024)...",
    "Running hybrid brute-force...",
    "Calculating crack time..."
  ];

  let i = 0;
  const interval = setInterval(() => {
    if (i < msgs.length) {
      term.innerHTML += msgs[i] + "<br>";
      term.scrollTop = term.scrollHeight;
      i++;
    } else {
      clearInterval(interval);
      const crack = crackOverride != null ? crackOverride : Math.max(0.05, (6 - score) * 0.65).toFixed(2);
      term.innerHTML += `<br>⚠ PASSWORD CRACKED IN ${crack} SECONDS`;
      const crackPct = 100 - fear;
      document.getElementById("bar").style.width = `${crackPct}%`;
      const crackLabel = document.getElementById("crackLabel");
      if (crackLabel) crackLabel.textContent = `${crackPct}%`;
      document.getElementById("story").innerHTML = `
        <b>🤖 Hacker AI Narrative:</b><br><br>
        Step 1: Scanned breach databases for "${pw.substring(0, 2)}***" patterns.<br>
        Step 2: Tested 847,000 common mutations in parallel.<br>
        Step 3: Found a match via dictionary + suffix rules.<br><br>
        <strong>Result:</strong> ${strength} — cracked in ${crack}s.<br>
        <strong>Fix:</strong> Use 4 random words + symbols + numbers (90+ bits entropy).
      `;
    }
  }, 450);
}

function socialAttack(info, guesses) {
  const name = (info && info.name) || document.getElementById("name").value;
  const pet = (info && info.pet) || document.getElementById("pet").value;
  const birth = (info && (info.birth || info.birthday)) || document.getElementById("birth").value;

  if (name) document.getElementById("name").value = name;
  if (pet) document.getElementById("pet").value = pet;
  if (birth) document.getElementById("birth").value = birth;

  const list = guesses || [
    `${pet}${birth}`,
    `${name}${birth}`,
    `${pet}@123`,
    `${name}123!`,
    birth
  ].filter(Boolean);

  const top = list[0] || "petname2001";

  document.getElementById("socialResult").innerHTML = `
    <b>🔍 Social Engineering Attack Log</b><br><br>
    <span style="color:var(--muted)">Try #1:</span> <span class="guess-list">${list[0] || "—"}</span> ❌<br>
    <span style="color:var(--muted)">Try #2:</span> <span class="guess-list">${top}</span> ✅ MATCH<br><br>
  <b>All guesses generated from your info:</b><br>
    <div class="guess-list">${list.map((g) => `→ ${g}`).join("<br>")}</div>
    <br>⚠ Never use personal information inside passwords.
  `;
}

function generatePassword() {
  const options = getGeneratorOptions();
  const hintEl = document.getElementById("genHint");
  const metaEl = document.getElementById("genMeta");
  const outEl = document.getElementById("generated");

  try {
    const result = buildSecurePassword(options);
    outEl.textContent = result.password;
    metaEl.innerHTML = `
      <span class="gen-stat strength-${result.strengthClass}"><strong>${result.strength}</strong></span>
      <span class="gen-stat">~<strong>${result.entropy}</strong> bits entropy</span>
      <span class="gen-stat">Pool: <strong>${result.poolSize}</strong> chars</span>
    `;
    hintEl.textContent = result.hint || "";
    hintEl.className = "gen-hint";
    return result.password;
  } catch (err) {
    outEl.textContent = "—";
    metaEl.innerHTML = "";
    hintEl.textContent = err.message;
    hintEl.className = "gen-hint gen-error";
    return null;
  }
}

const CHAR_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*-_+=?"
};

const SIMILAR_CHARS = new Set(["I", "l", "1", "|", "O", "0"]);

function filterCharset(chars, excludeSimilar) {
  if (!excludeSimilar) return chars;
  return [...chars].filter((c) => !SIMILAR_CHARS.has(c)).join("");
}

function secureRandomInt(max) {
  if (max <= 0) throw new Error("Invalid random range");
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let value;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

function pickChar(charset) {
  return charset[secureRandomInt(charset.length)];
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getGeneratorOptions() {
  return {
    length: parseInt(document.getElementById("genLength").value, 10),
    lower: document.getElementById("genLower").checked,
    upper: document.getElementById("genUpper").checked,
    numbers: document.getElementById("genNumbers").checked,
    symbols: document.getElementById("genSymbols").checked,
    excludeSimilar: document.getElementById("genExcludeSimilar").checked,
    requireEach: document.getElementById("genRequireEach").checked,
    noRepeat: document.getElementById("genNoRepeat").checked
  };
}

function buildSecurePassword(options) {
  const activeSets = [];
  if (options.lower) {
    activeSets.push({ key: "lower", chars: filterCharset(CHAR_SETS.lower, options.excludeSimilar) });
  }
  if (options.upper) {
    activeSets.push({ key: "upper", chars: filterCharset(CHAR_SETS.upper, options.excludeSimilar) });
  }
  if (options.numbers) {
    activeSets.push({ key: "numbers", chars: filterCharset(CHAR_SETS.numbers, options.excludeSimilar) });
  }
  if (options.symbols) {
    activeSets.push({ key: "symbols", chars: filterCharset(CHAR_SETS.symbols, options.excludeSimilar) });
  }
  const sets = activeSets.filter((s) => s.chars.length > 0);

  if (sets.length === 0) {
    throw new Error("Select at least one character set.");
  }

  const length = options.length;
  if (length < 6 || length > 128) {
    throw new Error("Length must be between 6 and 128.");
  }
  if (options.requireEach && length < sets.length) {
    throw new Error(`Length must be at least ${sets.length} when requiring each selected set.`);
  }

  const pool = [...new Set(sets.map((s) => s.chars).join("").split(""))].join("");
  const poolSize = pool.length;

  let useNoRepeat = options.noRepeat;
  let hint = "";
  if (useNoRepeat && length > poolSize) {
    useNoRepeat = false;
    hint = `No-repeat disabled: length ${length} exceeds pool size (${poolSize}).`;
  }

  const password = [];
  let available = pool;

  if (options.requireEach) {
    for (const set of sets) {
      let charset = set.chars;
      if (useNoRepeat) {
        charset = [...charset].filter((c) => available.includes(c)).join("");
        if (!charset.length) {
          useNoRepeat = false;
          hint = hint || "No-repeat fell back — not enough unique characters.";
          charset = set.chars;
        }
      }
      const ch = pickChar(charset);
      password.push(ch);
      if (useNoRepeat) {
        available = available.split("").filter((c) => c !== ch).join("");
      }
    }
  }

  while (password.length < length) {
    let charset = useNoRepeat ? available : pool;
    if (!charset.length) {
      useNoRepeat = false;
      hint = hint || "No-repeat fell back — pool exhausted.";
      charset = pool;
    }
    const ch = pickChar(charset);
    password.push(ch);
    if (useNoRepeat) {
      available = available.split("").filter((c) => c !== ch).join("");
    }
  }

  shuffleArray(password);
  const pw = password.join("");
  const entropy = estimateEntropy(length, poolSize);
  const strength = entropyLabel(entropy);

  return {
    password: pw,
    entropy,
    strength: strength.label,
    strengthClass: strength.className,
    poolSize,
    hint
  };
}

function estimateEntropy(length, poolSize) {
  if (poolSize <= 1) return 0;
  return Math.round(length * Math.log2(poolSize));
}

function entropyLabel(bits) {
  if (bits < 40) return { label: "Weak", className: "weak" };
  if (bits < 60) return { label: "Fair", className: "fair" };
  if (bits < 80) return { label: "Strong", className: "strong" };
  return { label: "Very Strong", className: "very-strong" };
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

async function copyGeneratedPassword() {
  const pw = document.getElementById("generated").textContent;
  if (!pw || pw === "—") {
    showToast("Generate a password first");
    return;
  }
  try {
    await navigator.clipboard.writeText(pw);
    showToast("Password copied to clipboard");
  } catch {
    showToast("Copy failed — select and copy manually");
  }
}

function syncLengthInputs(from) {
  const range = document.getElementById("genLength");
  const num = document.getElementById("genLengthNum");
  const label = document.getElementById("genLengthVal");
  let value = from === "num" ? parseInt(num.value, 10) : parseInt(range.value, 10);

  if (Number.isNaN(value)) value = 16;
  value = Math.min(128, Math.max(6, value));

  range.value = value;
  num.value = value;
  label.textContent = value;
}

function initPasswordGenerator() {
  const range = document.getElementById("genLength");
  const num = document.getElementById("genLengthNum");
  const genBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyPassword");

  if (!range) return;

  range.addEventListener("input", () => syncLengthInputs("range"));
  num.addEventListener("input", () => syncLengthInputs("num"));
  num.addEventListener("change", () => syncLengthInputs("num"));
  genBtn.addEventListener("click", generatePassword);
  copyBtn.addEventListener("click", copyGeneratedPassword);
}

function handleChatActions(actions) {
  if (!actions || !actions.length) return;

  actions.forEach((action) => {
    if (action.type === "highlight_password") {
      document.getElementById("pw").value = action.password;
      updateMetrics(action.score, action.strength);
    }
    if (action.type === "run_bruteforce") {
      analyzePassword(action.password);
    }
    if (action.type === "run_social_attack") {
      socialAttack(action.info, action.guesses);
    }
    if (action.type === "generate_password") {
      generatePassword();
    }
  });
}

async function refreshOllamaStatus() {
  const pill = document.getElementById("ollamaStatus");
  if (!pill) return;

  try {
    const res = await fetch("/api/chat/status");
    if (!res.ok) {
      pill.innerHTML = '<span class="status-dot offline"></span> Offline';
      pill.title = "Login required";
      return;
    }
    const data = await res.json();
    if (data.available) {
      pill.innerHTML = `<span class="status-dot"></span> Ollama · ${data.model}`;
      pill.title = `Local AI via ${data.base_url}`;
      pill.classList.add("ollama-live");
    } else if (data.enabled) {
      pill.innerHTML = '<span class="status-dot warn"></span> Demo mode';
      pill.title = `Ollama not running — using built-in replies. Start Ollama and run: ollama pull ${data.model}`;
      pill.classList.remove("ollama-live");
    } else {
      pill.innerHTML = '<span class="status-dot warn"></span> Built-in';
      pill.title = "Ollama disabled (OLLAMA_ENABLED=false)";
    }
  } catch {
    pill.innerHTML = '<span class="status-dot offline"></span> Unavailable';
  }
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  appendMessage("user", message);
  input.value = "";

  const typing = document.getElementById("typingIndicator");
  typing.style.display = "block";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, state: chatState })
    });

    if (!res.ok) {
      appendMessage("bot", "Session expired — please log in again.");
      return;
    }

    const data = await res.json();
    chatState = data.state || {};

    if (!data.ollama) {
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 350));
    }

    appendMessage("bot", data.reply);
    handleChatActions(data.actions);

    if (data.ollama_available !== undefined) {
      refreshOllamaStatus();
    }
  } catch (err) {
    appendMessage("bot", "Connection error. Is the Python server running?");
  } finally {
    typing.style.display = "none";
  }
}

function initChat() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");

  refreshOllamaStatus();
  sendBtn.addEventListener("click", sendChatMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
}
