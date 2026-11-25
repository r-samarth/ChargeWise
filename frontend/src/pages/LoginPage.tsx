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
    <div className="max-w-[460px] mx-auto px-[16px] py-[48px]">
      <div className="cw-card p-[24px] sm:p-[36px] space-y-[20px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">
            Sign in to ChargeWise
          </h1>
          <p className="text-[13px] text-[#45474D] mt-[6px] mb-0">
            Access your saved EVs, trip history, and notification inbox.
          </p>
        </div>

        {errorMsg && (
          <StatusAlert title="Sign-in failed" message={errorMsg} variant="error" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]" noValidate>
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#121317] mb-[6px]">
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
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-[6px]">
              <label htmlFor="password" className="text-[13px] font-medium text-[#121317]">
                Password
              </label>
              <Link to="/forgot-password" className="text-[13px] text-[#45474D] underline">
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
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">{errors.password.message}</p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="border-t border-[#E6EAF0] pt-[16px] space-y-[12px]">
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="cw-btn-secondary w-full"
          >
            Sign in with Google
          </button>
          <p className="text-[13px] text-[#45474D] text-center m-0">
            New to ChargeWise?{" "}
            <Link to="/register" className="font-medium text-[#121317] underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
