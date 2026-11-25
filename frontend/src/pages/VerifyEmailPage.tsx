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
    <div className="max-w-[520px] mx-auto px-[16px] py-[48px]">
      <div className="cw-card p-[24px] sm:p-[36px] space-y-[20px]">
        <h1 className="text-[28px] font-semibold text-[#121317] m-0">
          Email verification
        </h1>
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
          <p className="text-[15px] text-[#45474D] m-0">
            We sent a verification link to{" "}
            <strong className="text-[#121317]">{firebaseUser?.email || "your email"}</strong>.
            You can already explore stations and plan routes, and verify anytime.
          </p>
        )}

        {notice && <StatusAlert title="Status" message={notice} />}

        <div className="flex flex-wrap gap-[10px]">
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
