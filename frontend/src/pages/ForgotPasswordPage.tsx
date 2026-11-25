import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter the email associated with your account."),
});

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[460px] mx-auto px-4 py-12 sm:py-16">
      <div className="cw-card p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <span className="cw-eyebrow">Account Recovery</span>
          <h1 className="text-[28px] font-bold text-[#0F172A] leading-tight">Reset password</h1>
          <p className="text-[13.5px] text-[#475569]">
            Firebase Authentication will send a password reset link to your email.
          </p>
        </div>

        {sent && (
          <StatusAlert
            title="Reset email requested"
            message="If an account matches that address, check your inbox for the reset link."
          />
        )}
        {errorMsg && <StatusAlert title="Reset error" message={errorMsg} variant="error" />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Email address
            </label>
            <input id="email" type="email" className="cw-input" {...register("email")} />
            {errors.email && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">{errors.email.message}</p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <p className="text-[13px] text-center">
          <Link to="/login" className="font-semibold text-[#1D4ED8] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
