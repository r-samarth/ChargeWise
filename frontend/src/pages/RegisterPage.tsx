import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";

const schema = z
  .object({
    displayName: z.string().min(2, "Enter your full name (at least 2 characters).").max(120),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await registerWithEmail(values.displayName, values.email, values.password);
      navigate("/verify-email");
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
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
          <span className="cw-eyebrow">Get Started</span>
          <h1 className="text-[28px] font-bold text-[#0F172A] leading-tight">
            Create your ChargeWise account
          </h1>
          <p className="text-[13.5px] text-[#475569]">
            Secured by Firebase Authentication. Save EVs and plan Karnataka journeys.
          </p>
        </div>

        {errorMsg && (
          <StatusAlert title="Registration failed" message={errorMsg} variant="error" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="displayName" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Full name
            </label>
            <input
              id="displayName"
              type="text"
              className="cw-input"
              placeholder="Samarth R"
              {...register("displayName")}
            />
            {errors.displayName && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className="cw-input"
              placeholder="driver@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="cw-input"
              placeholder="At least 8 characters"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="cw-input"
              placeholder="Re-enter password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="border-t border-slate-200/75 pt-4 space-y-3">
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="cw-btn-secondary w-full"
          >
            Continue with Google
          </button>
          <p className="text-[13px] text-[#475569] text-center">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-[#1D4ED8] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
