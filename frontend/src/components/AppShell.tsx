import {
  Bell,
  Car,
  Compass,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Shield,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = [
    { to: "/stations", label: "Stations", icon: Compass },
    ...(firebaseUser
      ? [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/plan", label: "Trip Planner", icon: MapIcon },
          { to: "/vehicles", label: "Vehicles", icon: Car },
          { to: "/saved-journeys", label: "Saved Trips", icon: Zap },
          { to: "/notifications", label: "Inbox", icon: Bell },
          ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col text-[#0F172A]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-[12px] focus:left-[12px] focus:z-50 cw-btn-primary"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 cw-glass-nav">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2.5 font-bold text-[18px] text-[#0F172A] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <span
                className="w-[32px] h-[32px] rounded-full text-white inline-flex items-center justify-center shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                <Zap size={16} aria-hidden="true" />
              </span>
              <span>ChargeWise</span>
              <span className="hidden sm:inline-flex cw-pill cw-pill-accent">Karnataka</span>
            </Link>

            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13.5px] font-medium transition-all ${
                        isActive
                          ? "bg-[#2563EB] text-white shadow-[0_6px_16px_-4px_rgba(37,99,235,0.45)]"
                          : "text-[#475569] hover:bg-[#DBEAFE]/65 hover:text-[#1D4ED8]"
                      }`
                    }
                  >
                    <Icon size={14} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-2.5">
            {firebaseUser ? (
              <>
                <Link
                  to="/profile"
                  className="cw-btn-secondary !py-[7px] !px-[14px]"
                >
                  <UserIcon size={14} aria-hidden="true" />
                  <span>{profile?.display_name || firebaseUser.email?.split("@")[0] || "Account"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="cw-btn-secondary !py-[7px] !px-[14px]"
                  aria-label="Sign out"
                >
                  <LogOut size={14} aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="cw-btn-secondary">
                  Sign in
                </Link>
                <Link to="/register" className="cw-btn-primary">
                  Create account
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden cw-btn-secondary !p-2"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-white/75 bg-white/85 backdrop-blur-xl px-4 py-4 flex flex-col gap-2"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="px-3.5 py-2.5 rounded-2xl text-[15px] font-medium text-[#0F172A] hover:bg-[#DBEAFE]/60"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200/70 flex flex-wrap gap-2">
              {firebaseUser ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="cw-btn-secondary"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="cw-btn-primary"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="cw-btn-secondary"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="cw-btn-primary"
                  >
                    Create account
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 border-t border-white/80 bg-white/60 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-[#475569]">
          <div className="space-y-1">
            <p className="font-semibold text-[#0F172A]">
              ChargeWise — Karnataka EV Charging Intelligence
            </p>
            <p className="text-[#64748B]">
              Verified station provenance & deterministic trip planning. Live charger occupancy is never fabricated.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 font-medium text-[#334155]">
            <Link to="/stations" className="hover:text-[#2563EB] transition-colors">
              Station Explorer
            </Link>
            <Link to="/plan" className="hover:text-[#2563EB] transition-colors">
              Trip Planner
            </Link>
            <Link to="/trip-history" className="hover:text-[#2563EB] transition-colors">
              Trip History
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
