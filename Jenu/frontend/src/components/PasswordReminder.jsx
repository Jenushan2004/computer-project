import { Link } from "react-router-dom";

export default function PasswordReminder({ reminder }) {
  if (!reminder?.reminder_due) return null;

  const expired = reminder.is_expired;
  return (
    <div className={`banner ${expired ? "banner-danger" : "banner-warn"}`}>
      <div className="banner-icon">{expired ? "⚠" : "🔔"}</div>
      <div>
        <strong>{expired ? "Password expired" : "Password change reminder"}</strong>
        <p>
          {expired
            ? "Your password is over 6 months old. Update it now."
            : `Expires in ${reminder.days_until_expiry} day(s). Update before ${reminder.password_expires_at}.`}
        </p>
      </div>
      <Link to="/account" className="btn btn-sm btn-primary">
        Change Password
      </Link>
    </div>
  );
}
