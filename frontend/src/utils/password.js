const CHAR_SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*-_+=?",
};

const SIMILAR_CHARS = new Set(["I", "l", "1", "|", "O", "0"]);

export function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function strengthLabel(score) {
  if (score <= 1) return "Very Weak";
  if (score === 2) return "Weak";
  if (score === 3) return "Moderate";
  if (score === 4) return "Strong";
  return "Very Strong";
}

function filterCharset(chars, excludeSimilar) {
  if (!excludeSimilar) return chars;
  return [...chars].filter((c) => !SIMILAR_CHARS.has(c)).join("");
}

function secureRandomInt(max) {
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

export function buildSecurePassword(options) {
  const activeSets = [];
  if (options.lower) activeSets.push({ chars: filterCharset(CHAR_SETS.lower, options.excludeSimilar) });
  if (options.upper) activeSets.push({ chars: filterCharset(CHAR_SETS.upper, options.excludeSimilar) });
  if (options.numbers) activeSets.push({ chars: filterCharset(CHAR_SETS.numbers, options.excludeSimilar) });
  if (options.symbols) activeSets.push({ chars: filterCharset(CHAR_SETS.symbols, options.excludeSimilar) });

  const sets = activeSets.filter((s) => s.chars.length > 0);
  if (!sets.length) throw new Error("Select at least one character set.");

  const length = options.length;
  if (length < 6 || length > 128) throw new Error("Length must be between 6 and 128.");
  if (options.requireEach && length < sets.length) {
    throw new Error(`Length must be at least ${sets.length} when requiring each set.`);
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
          charset = set.chars;
        }
      }
      const ch = pickChar(charset);
      password.push(ch);
      if (useNoRepeat) available = available.split("").filter((c) => c !== ch).join("");
    }
  }

  while (password.length < length) {
    let charset = useNoRepeat ? available : pool;
    if (!charset.length) {
      useNoRepeat = false;
      charset = pool;
    }
    const ch = pickChar(charset);
    password.push(ch);
    if (useNoRepeat) available = available.split("").filter((c) => c !== ch).join("");
  }

  shuffleArray(password);
  const pw = password.join("");
  const entropy = estimateEntropy(length, poolSize);
  const strength = entropyLabel(entropy);

  return { password: pw, entropy, strength: strength.label, strengthClass: strength.className, poolSize, hint };
}

export function formatBotMessage(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}
