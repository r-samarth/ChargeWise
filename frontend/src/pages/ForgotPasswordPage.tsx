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
    <div className="max-w-[460px] mx-auto px-[16px] py-[48px]">
      <div className="cw-card p-[24px] sm:p-[36px] space-y-[20px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">Reset password</h1>
          <p className="text-[13px] text-[#45474D] mt-[6px] mb-0">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]" noValidate>
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#121317] mb-[6px]">
              Email address
            </label>
            <input id="email" type="email" className="cw-input" {...register("email")} />
            {errors.email && (
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">{errors.email.message}</p>
            )}
          </div>
          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <p className="text-[13px] text-center m-0">
          <Link to="/login" className="text-[#121317] underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
