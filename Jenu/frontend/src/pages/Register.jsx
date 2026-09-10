import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(username, password);
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <p className="eyebrow">Join TriCipher</p>
        <h1 className="display-title">Start with safe, guided practice.</h1>
        <p className="auth-brand-copy">
          Create a free account to unlock the AI coach. Every simulation runs locally in your browser — educational use only.
        </p>
        <ul className="auth-brand-list">
          <li>No credit card required</li>
          <li>Password rotation every 6 months</li>
          <li>Demos available without signing up</li>
        </ul>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <h2>Create account</h2>
          <p>Pick a username and a strong password to get started.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <label className="field">
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} autoComplete="username" required />
            </label>
            <label className="field">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} autoComplete="new-password" required />
            </label>
            <button type="submit" className="btn btn-primary full">
              Create account
            </button>
          </form>
          <p className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
