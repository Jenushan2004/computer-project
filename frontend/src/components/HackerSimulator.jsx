import { forwardRef, useImperativeHandle, useState } from "react";
import { scorePassword, strengthLabel } from "../utils/password";

const HackerSimulator = forwardRef(function HackerSimulator({ password, setPassword, onStory }, ref) {
  const [strength, setStrength] = useState("—");
  const [fear, setFear] = useState("—");
  const [bar, setBar] = useState(0);
  const [terminal, setTerminal] = useState("");

  const getFearColor = (fearValue) => {
  const value = parseInt(fearValue, 10); 

  if (value <= 40) {
    return "#00c896"; // Green
  }

  if (value < 80) {
    return "#f2c94c"; // Yellow
  }

  return "#ff5c5c"; // Red
};
  const run = (forcedPw, crackOverride) => {
    const pw = forcedPw || password;
    if (!pw) return;
    setPassword(pw);

    const score = scorePassword(pw);
    const label = strengthLabel(score);
    const fearVal = 100 - score * 20;
    setStrength(`${score * 20}/100 (${label})`);
    setFear(`${fearVal}%`);
    setBar(0);
    setTerminal("");
    

    const msgs = [
      "[ Hacker AI Activated ]",
      "Initializing GPU hash cluster…",
      "Searching 12B leaked passwords…",
      "Trying dictionary attack (rockyou.txt)…",
      "Testing keyboard patterns…",
      "Running hybrid brute-force…",
      "Calculating crack time…",
      "Password strength score: " + score * 20 + "/100 (" + label + ")",
      "SQL Injection detected in password input!",
      "Attempting to bypass input validation…",
      "Password hash found in database!",
      "Decrypting password hash…",
      
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < msgs.length) {
        setTerminal((t) => t + msgs[i] + "\n");
        i++;
      } else {
        clearInterval(interval);
        const crack = crackOverride ?? Math.max(0.05, (6 - score) * 0.65).toFixed(2);
        setTerminal((t) => t + `\n⚠ PASSWORD CRACKED IN ${crack} SECONDS`);
        setBar(100 - fearVal);
        onStory?.({ pw, label, crack, score });
      }
    }, 400);
  };

  useImperativeHandle(ref, () => ({ run }));

  return (
    <section className="panel panel-terminal">
      <header className="panel-head">
        <div>
          <span className="eyebrow red">Live Demo</span>
          <h2>Hacker Simulator</h2>
        </div>
      </header>
      <div className="panel-body">
        <label className="field">
          Password to test
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password to attack…"
          />
        </label>
        <button type="button" className="btn btn-danger full" onClick={() => run()}>
          Launch Attack Simulation
        </button>
        <div className="metrics">
          <div className="metric">
            <span className="metric-label">Security</span>
            <span className="metric-value">{strength}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Fear</span>
           <span className="metric-value" style={{ color: getFearColor(fear) }}> {fear}</span>
          </div>
        </div>
        <div className="progress-track">
           <div className="progress-fill" style={{ width: `${bar}%`, backgroundColor: getFearColor(fear),}} />
        </div>
        <div className="terminal">
          <div className="terminal-bar">
            <span /><span /><span />
            hacker@tricipher — bash
          </div>
          <pre>{terminal || "Waiting for target…"}</pre>
        </div>
      </div>
    </section>
  );
});

export default HackerSimulator;
