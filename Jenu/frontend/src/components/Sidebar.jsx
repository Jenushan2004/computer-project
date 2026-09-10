import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: "◈" },
  { to: "/account", label: "Account", icon: "◉", auth: true },
  { to: "/admin", label: "Admin", icon: "◆", admin: true },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  if (isAuthPage) return null;

  const links = NAV.filter((item) => {
    if (item.auth && !user) return false;
    if (item.admin && !user?.is_admin) return false;
    return true;
  });

  return (
    <>
      <div className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Link to="/" className="logo" onClick={onClose}>
            <span className="logo-mark" aria-hidden="true">TC</span>
            <span className="logo-text">
              Tri<span>Cipher</span>
            </span>
          </Link>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          {user ? (
            <>
              <div className="sidebar-user">
                <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                <div className="sidebar-user-meta">
                  <strong>{user.username}</strong>
                  <span>{user.is_admin ? "Administrator" : "Learner"}</span>
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm sidebar-logout" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <div className="sidebar-guest">
              <p>Sign in to unlock the AI coach</p>
              <div className="sidebar-guest-actions">
                <Link to="/login" className="btn btn-ghost btn-sm" onClick={onClose}>Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={onClose}>Register</Link>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
