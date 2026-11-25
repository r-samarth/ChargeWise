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
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#121317]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-[10px] focus:left-[10px] focus:z-50 cw-btn-primary"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E6EAF0]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] h-[60px] flex items-center justify-between gap-[16px]">
          <div className="flex items-center gap-[24px]">
            <Link
              to="/"
              className="flex items-center gap-[8px] font-semibold text-[18px] text-[#121317] tracking-tight"
            >
              <span className="w-[28px] h-[28px] rounded-[999px] bg-[#121317] text-[#FFFFFF] inline-flex items-center justify-center">
                <Zap size={15} aria-hidden="true" />
              </span>
              <span>ChargeWise</span>
              <span className="hidden sm:inline-flex cw-pill">Karnataka</span>
            </Link>

            <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-[4px]">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-colors ${
                        isActive
                          ? "bg-[#121317] text-[#FFFFFF]"
                          : "text-[#45474D] hover:bg-[#F8F9FC] hover:text-[#121317]"
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

          <div className="hidden lg:flex items-center gap-[10px]">
            {firebaseUser ? (
              <>
                <Link
                  to="/profile"
                  className="cw-btn-secondary py-[6px] px-[14px]"
                >
                  <UserIcon size={14} aria-hidden="true" />
                  <span>{profile?.display_name || firebaseUser.email?.split("@")[0] || "Account"}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="cw-btn-secondary py-[6px] px-[14px]"
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
            className="lg:hidden cw-btn-secondary p-[8px]"
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
            className="lg:hidden border-t border-[#E6EAF0] bg-[#FFFFFF] px-[16px] py-[16px] flex flex-col gap-[8px]"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="px-[14px] py-[10px] rounded-[16px] text-[15px] text-[#121317] hover:bg-[#F8F9FC]"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-[8px] border-t border-[#E6EAF0] flex flex-wrap gap-[8px]">
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

      <footer className="border-t border-[#E6EAF0] bg-[#FFFFFF] mt-[48px]">
        <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[16px] text-[13px] text-[#6A6A71]">
          <div>
            <p className="m-0 font-medium text-[#121317]">
              ChargeWise — Karnataka EV Charging Intelligence
            </p>
            <p className="m-0 mt-[4px]">
              Verified station provenance & deterministic trip planning. Live charger occupancy is never fabricated.
            </p>
          </div>
          <div className="flex flex-wrap gap-[16px]">
            <Link to="/stations" className="hover:text-[#121317]">
              Station Explorer
            </Link>
            <Link to="/plan" className="hover:text-[#121317]">
              Trip Planner
            </Link>
            <Link to="/trip-history" className="hover:text-[#121317]">
              Trip History
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
