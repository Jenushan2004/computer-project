import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordReminder from "../components/PasswordReminder";
import ChatPanel from "../components/ChatPanel";
import HackerSimulator from "../components/HackerSimulator";
import SocialAttack from "../components/SocialAttack";
import PasswordGenerator from "../components/PasswordGenerator";
import StoryMode from "../components/StoryMode";

const FEATURES = [
  { label: "Brute-force lab", desc: "Watch dictionary attacks in real time" },
  { label: "Social engineering", desc: "See how personal info weakens passwords" },
  { label: "AI coach", desc: "Ollama-powered adversarial guidance" },
  { label: "Secure generator", desc: "Browser-native entropy-backed passwords" },
];

export default function Home() {
  const { user, passwordReminder } = useAuth();
  const [password, setPassword] = useState("");
  const [socialInfo, setSocialInfo] = useState({ name: "", pet: "", birth: "" });
  const [story, setStory] = useState("");
  const simRef = useRef(null);
  const socialRef = useRef(null);
  const genRef = useRef(null);

  const handleChatActions = (actions) => {
    if (!actions?.length) return;
    actions.forEach((action) => {
      if (action.type === "highlight_password") setPassword(action.password);
      if (action.type === "run_bruteforce") simRef.current?.run(action.password);
      if (action.type === "run_social_attack") socialRef.current?.run(action.info, action.guesses);
      if (action.type === "generate_password") genRef.current?.generate();
    });
  };

  const onStory = ({ pw, label, crack }) => {
    setStory(
      `Hacker AI scanned breach databases for "${pw.slice(0, 2)}***" patterns, tested 847K mutations, and cracked via dictionary rules.\n\nResult: ${label} — cracked in ${crack}s.\nFix: Use 4 random words + symbols (90+ bits entropy).`
    );
  };

  return (
    <div className="page home-page">
      <header className="hero">
        <p className="eyebrow">Cybersecurity education</p>
        <h1 className="display-title">
          Think like a hacker.
          <br />
          Protect like a pro.
        </h1>
        <p className="hero-lead">
          Hands-on password security labs, live attack simulations, and an AI coach — built for learners who want to understand threats, not just memorize rules.
        </p>
        <div className="feature-strip">
          {FEATURES.map((f) => (
            <div key={f.label} className="feature-chip">
              <strong>{f.label}</strong>
              <span>{f.desc}</span>
            </div>
          ))}
        </div>
      </header>

      {user && <PasswordReminder reminder={passwordReminder} />}

      {!user && (
        <div className="cta-banner">
          <div>
            <h3>Unlock the TriCipher AI Coach</h3>
            <p>Register free to chat with the adversarial coach. All demos below work without an account.</p>
          </div>
          <Link to="/register" className="btn btn-primary">Get started</Link>
        </div>
      )}

      <div className="dashboard-grid">
        <ChatPanel onAction={handleChatActions} />
        <div className="demo-stack">
          <HackerSimulator ref={simRef} password={password} setPassword={setPassword} onStory={onStory} />
          <div className="demo-row">
            <SocialAttack ref={socialRef} info={socialInfo} setInfo={setSocialInfo} />
            <PasswordGenerator ref={genRef} />
          </div>
          <StoryMode story={story} />
        </div>
      </div>
    </div>
  );
}
