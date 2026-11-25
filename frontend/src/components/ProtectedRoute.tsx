import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { firebaseUser, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-12">
        <div className="cw-card p-6 text-[#475569]">
          Verifying session with Firebase Authentication...
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-12">
        <div className="cw-card p-6 space-y-2">
          <h1 className="text-[22px] font-bold text-[#0F172A]">
            Administrator access required
          </h1>
          <p className="text-[15px] text-[#475569]">
            This route enforces backend Firebase custom claims and PostgreSQL admin role verification.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
