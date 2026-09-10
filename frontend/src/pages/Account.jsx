import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import PasswordReminder from "../components/PasswordReminder";

export default function Account() {
  const { user, passwordReminder, refresh } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });

  if (!user) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.changePassword({
        current_password: form.current,
        new_password: form.newPw,
        confirm_password: form.confirm,
      });
      setSuccess("Password updated. Next change due in 6 months.");
      setForm({ current: "", newPw: "", confirm: "" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const daysLeft = user.days_until_expiry ?? null;
  const progress = user.rotation_days
    ? Math.max(0, Math.min(100, ((user.rotation_days - (daysLeft ?? user.rotation_days)) / user.rotation_days) * 100))
    : 0;

  return (
    <div className="page account-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account security</p>
          <h1 className="page-title">Password rotation</h1>
          <p className="page-sub">Policy applies to <strong>{user.username}</strong> — change credentials every 6 months.</p>
        </div>
      </header>

      <PasswordReminder reminder={passwordReminder} />

      <div className="account-grid">
        <section className="panel">
          <header className="panel-head">
            <div>
              <p className="panel-kicker">Status</p>
              <h2>Rotation timeline</h2>
            </div>
            {daysLeft != null && (
              <span className={`tag ${daysLeft <= 14 ? "warn" : "ok"}`}>
                {daysLeft} days left
              </span>
            )}
          </header>
          <div className="panel-body">
            <div className="rotation-bar">
              <div className="rotation-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="status-grid">
              <div><span>Last changed</span><strong>{user.password_changed_at || "—"}</strong></div>
              <div><span>Next due</span><strong>{user.password_expires_at || "—"}</strong></div>
              <div><span>Days remaining</span><strong>{user.days_until_expiry ?? "—"}</strong></div>
              <div><span>Policy interval</span><strong>{user.rotation_days || 182} days</strong></div>
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <div>
              <p className="panel-kicker">Credentials</p>
              <h2>Change password</h2>
            </div>
          </header>
          <div className="panel-body">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-info">{success}</div>}
            <form onSubmit={submit}>
              <label className="field">
                Current password
                <input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" required />
              </label>
              <label className="field">
                New password
                <input type="password" value={form.newPw} onChange={(e) => setForm({ ...form, newPw: e.target.value })} minLength={6} autoComplete="new-password" required />
              </label>
              <label className="field">
                Confirm new password
                <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} minLength={6} autoComplete="new-password" required />
              </label>
              <button type="submit" className="btn btn-primary full">Update password</button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
