import { useState } from "react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const { firebaseUser, resendVerificationEmail, refreshProfile } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleResend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setNotice("Verification email sent. Check your inbox and spam folder.");
    } catch (err) {
      setNotice((err as Error).message || "Could not send verification email.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheck = async () => {
    setBusy(true);
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="max-w-[540px] mx-auto px-4 py-12 sm:py-16">
      <div className="cw-card p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <span className="cw-eyebrow">Security</span>
          <h1 className="text-[28px] font-bold text-[#0F172A] leading-tight">
            Email verification
          </h1>
        </div>
        {firebaseUser?.emailVerified ? (
          <StatusAlert
            title="Email verified"
            message={`Your address (${firebaseUser.email}) is verified.`}
            action={
              <Link to="/dashboard" className="cw-btn-primary">
                Go to Dashboard
              </Link>
            }
          />
        ) : (
          <p className="text-[15px] text-[#475569] leading-relaxed">
            We sent a verification link to{" "}
            <strong className="text-[#0F172A]">{firebaseUser?.email || "your email"}</strong>.
            You can already explore stations and plan routes, and verify anytime.
          </p>
        )}

        {notice && <StatusAlert title="Status" message={notice} />}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button type="button" onClick={handleCheck} disabled={busy} className="cw-btn-primary">
            I verified my email
          </button>
          <button type="button" onClick={handleResend} disabled={busy} className="cw-btn-secondary">
            Resend verification email
          </button>
          <Link to="/dashboard" className="cw-btn-secondary">
            Continue to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
