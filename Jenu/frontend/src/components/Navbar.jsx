import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="logo">
          <span className="logo-icon">⬡</span>
          Tri<span className="logo-accent">Cipher</span>
        </Link>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">
                <span className="pulse-dot" />
                {user.username}
              </span>
              <NavLink to="/account" className="btn btn-ghost btn-sm">
                Account
              </NavLink>
              {user.is_admin && (
                <NavLink to="/admin" className="btn btn-ghost btn-sm">
                  Admin
                </NavLink>
              )}
              <button type="button" className="btn btn-primary btn-sm" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">
                Login
              </NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">
                Get Started
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
