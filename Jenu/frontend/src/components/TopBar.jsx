import { useLocation } from "react-router-dom";

const TITLES = {
  "/": "Dashboard",
  "/login": "Sign in",
  "/register": "Create account",
  "/account": "Account security",
  "/admin": "User management",
};

export default function TopBar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || "TriCipher";
  const isAuthPage = ["/login", "/register"].includes(pathname);

  if (isAuthPage) return null;

  return (
    <header className="topbar">
      <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Open menu">
        <span />
        <span />
        <span />
      </button>
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-badge">Live demos</div>
    </header>
  );
}
