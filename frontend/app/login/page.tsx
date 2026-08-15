"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Field, InlineAlert, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { login, demoLogin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  // Preserve the page the user was trying to reach before being redirected.
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const session = await login(values.email, values.password);
      toast.success("Signed in", `Welcome back, ${session.user.name}.`);
      router.push(redirectTo);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Sign in failed. Please try again.";
      setServerError(message);
    }
  };

  const onDemoLogin = async () => {
    setServerError(null);
    setDemoLoading(true);
    try {
      const session = await demoLogin("analyst");
      toast.success("Demo session started", `Signed in as ${session.user.name}.`);
      router.push(redirectTo);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Could not start a demo session. Confirm the backend is running.";
      setServerError(message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <>
      <div className="auth-heading">
        <h1>Welcome Back</h1>
        <p>Sign in to continue to the AtmosIQ intelligence platform.</p>
      </div>

      {serverError ? <InlineAlert variant="error">{serverError}</InlineAlert> : null}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email" htmlFor="login-email" required error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@organisation.org"
            autoComplete="email"
            autoFocus
          />
        </Field>

        <div className="field">
          <label className="field-label" htmlFor="login-password">
            Password
            <span className="field-required" aria-hidden="true">
              *
            </span>
          </label>
          <div className="input-group">
            <Input
              {...register("password")}
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "login-password-error" : undefined}
            />
            <button
              type="button"
              className="input-affix"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password ? (
            <span className="field-error" id="login-password-error" role="alert">
              {errors.password.message}
            </span>
          ) : null}
        </div>

        <div className="auth-form-row">
          <label className="checkbox-row" htmlFor="login-remember">
            <input
              {...register("remember")}
              id="login-remember"
              type="checkbox"
              className="checkbox"
            />
            Remember me
          </label>

          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" block loading={isSubmitting}>
          {!isSubmitting ? <LogIn size={17} aria-hidden="true" /> : null}
          {isSubmitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <div className="divider-text">or</div>

      <div className="auth-demo">
        <p className="auth-demo-title">
          <Sparkles size={15} aria-hidden="true" />
          Evaluating AtmosIQ?
        </p>
        <p className="auth-demo-text">
          Start a pre-populated analyst session immediately — no registration required. The
          demo account has full read access to the intelligence dashboard.
        </p>
        <Button variant="secondary" block onClick={onDemoLogin} loading={demoLoading}>
          Continue with Demo Account
        </Button>
      </div>

      <p className="auth-alt">
        Don&rsquo;t have an account?{" "}
        <Link href="/register" className="auth-link">
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="skeleton" style={{ height: 400 }} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
