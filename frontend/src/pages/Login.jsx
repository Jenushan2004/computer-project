import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <p className="eyebrow">TriCipher</p>
        <h1 className="display-title">Your adversarial security coach.</h1>
        <p className="auth-brand-copy">
          Learn password hygiene through simulated attacks, breach-aware analysis, and guided remediation — not slide decks.
        </p>
        <ul className="auth-brand-list">
          <li>Live brute-force and social-engineering demos</li>
          <li>6-month rotation policy with proactive reminders</li>
          <li>Optional Ollama AI for personalized coaching</li>
        </ul>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <h2>Welcome back</h2>
          <p>Sign in to access the AI coach and account settings.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <label className="field">
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label className="field">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button type="submit" className="btn btn-primary full">
              Sign in
            </button>
          </form>
          <p className="auth-footer">
            No account? <Link to="/register">Create one free</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
