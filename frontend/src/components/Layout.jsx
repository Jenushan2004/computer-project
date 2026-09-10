import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const isAuthPage = ["/login", "/register"].includes(pathname);

  return (
    <div className={`app-shell ${isAuthPage ? "auth-mode" : ""}`}>
      <div className="bg-grid" aria-hidden="true" />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="app-main">
        <TopBar onMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className={`page-main ${isAuthPage ? "auth-main" : ""}`}>
          <Outlet />
        </main>
        {!isAuthPage && (
          <footer className="site-footer">
            <span>TriCipher</span>
            <span>Educational cybersecurity platform</span>
          </footer>
        )}
      </div>
    </div>
  );
}
