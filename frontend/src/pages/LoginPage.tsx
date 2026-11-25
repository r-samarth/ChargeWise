import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const nextPath = params.get("next") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await loginWithEmail(values.email, values.password);
      navigate(nextPath);
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
      navigate(nextPath);
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
          <span className="cw-eyebrow">Welcome Back</span>
          <h1 className="text-[28px] font-bold text-[#0F172A] leading-tight">
            Sign in to ChargeWise
          </h1>
          <p className="text-[13.5px] text-[#475569]">
            Access your saved EVs, trip history, and notification inbox.
          </p>
        </div>

        {errorMsg && (
          <StatusAlert title="Sign-in failed" message={errorMsg} variant="error" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="text-[13px] font-semibold text-[#1E293B]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[13px] font-medium text-[#1D4ED8] hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              className="cw-input"
              placeholder="Enter password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="border-t border-slate-200/75 pt-4 space-y-3">
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="cw-btn-secondary w-full"
          >
            Sign in with Google
          </button>
          <p className="text-[13px] text-[#475569] text-center">
            New to ChargeWise?{" "}
            <Link to="/register" className="font-semibold text-[#1D4ED8] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
