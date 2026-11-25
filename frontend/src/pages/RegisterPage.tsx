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
    <div className="max-w-[460px] mx-auto px-[16px] py-[48px]">
      <div className="cw-card p-[24px] sm:p-[36px] space-y-[20px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">
            Create your ChargeWise account
          </h1>
          <p className="text-[13px] text-[#45474D] mt-[6px] mb-0">
            Secured by Firebase Authentication. Save EVs and plan Karnataka journeys.
          </p>
        </div>

        {errorMsg && (
          <StatusAlert title="Registration failed" message={errorMsg} variant="error" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]" noValidate>
          <div>
            <label htmlFor="displayName" className="block text-[13px] font-medium text-[#121317] mb-[6px]">
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
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">
                {errors.displayName.message}
              </p>
            )}
          </div>

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
            <label htmlFor="password" className="block text-[13px] font-medium text-[#121317] mb-[6px]">
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
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[#121317] mb-[6px]">
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
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={submitting} className="cw-btn-primary w-full">
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="border-t border-[#E6EAF0] pt-[16px] space-y-[12px]">
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="cw-btn-secondary w-full"
          >
            Continue with Google
          </button>
          <p className="text-[13px] text-[#45474D] text-center m-0">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-[#121317] underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
