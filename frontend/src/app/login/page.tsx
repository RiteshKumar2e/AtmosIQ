"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BarChart3, ShieldCheck, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/layout/Logo";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Separator,
  Tabs,
} from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Please enter your full name").max(120),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Password is too long"),
  organisation: z.string().max(160).optional(),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

const DEMO_ACCOUNTS = [
  {
    role: "authority" as const,
    label: "Demo Authority",
    icon: ShieldCheck,
    detail: "Full operational access — acknowledge, assign, and resolve alerts; run the live scenario.",
  },
  {
    role: "analyst" as const,
    label: "Demo Analyst",
    icon: BarChart3,
    detail: "Intelligence and analytics access, including alert triage and the live scenario.",
  },
  {
    role: "citizen" as const,
    label: "Demo Citizen",
    icon: UserIcon,
    detail: "Submit pollution reports and view public intelligence. Cannot action alerts.",
  },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, demoSignIn } = useAuth();

  const redirectTo = searchParams.get("next") || "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pendingDemo, setPendingDemo] = useState<string | null>(null);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", organisation: "" },
  });

  async function onSignIn(values: SignInValues) {
    try {
      const user = await signIn(values.email, values.password);
      toast.success(`Signed in as ${user.name}`);
      router.push(redirectTo);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Sign in failed. Please try again.";
      signInForm.setError("password", { message });
    }
  }

  async function onSignUp(values: SignUpValues) {
    try {
      const user = await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        organisation: values.organisation || undefined,
      });
      toast.success(`Welcome, ${user.name}`);
      router.push(redirectTo);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Registration failed. Please try again.";
      signUpForm.setError("email", { message });
    }
  }

  async function onDemo(role: "authority" | "analyst" | "citizen") {
    setPendingDemo(role);
    try {
      const user = await demoSignIn(role);
      toast.success(`Signed in as ${user.name}`);
      router.push(redirectTo);
    } catch (error) {
      toast.error("Demo sign-in failed", {
        description:
          error instanceof ApiError
            ? error.message
            : "Check that the backend is running on port 8000.",
      });
    } finally {
      setPendingDemo(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to overview
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* ------------------------------------------------ demo accounts */}
          <section>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
              Sign in to AeroShield
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Use a demonstration account for immediate access, or sign in with your own
              credentials.
            </p>

            <Card className="mt-5 overflow-hidden">
              <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--color-ink)]">
                    One-click demo access
                  </p>
                  <Badge tone="brand" size="sm">Recommended</Badge>
                </div>
              </div>

              <ul className="divide-y divide-[var(--color-line)]">
                {DEMO_ACCOUNTS.map((account) => {
                  const Icon = account.icon;
                  return (
                    <li key={account.role}>
                      <button
                        type="button"
                        onClick={() => onDemo(account.role)}
                        disabled={pendingDemo !== null}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-brand-50)] disabled:opacity-60"
                      >
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-ink)]">
                              {account.label}
                            </span>
                            {pendingDemo === account.role && (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand-500)]" />
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                            {account.detail}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-4 py-2.5">
                <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                  Demo accounts share the password{" "}
                  <code className="rounded bg-[var(--color-surface)] px-1 py-0.5 font-mono text-[10px] text-[var(--color-ink)]">
                    Demo@2025
                  </code>{" "}
                  and are seeded for demonstration only.
                </p>
              </div>
            </Card>
          </section>

          {/* ---------------------------------------------------- own login */}
          <section>
            <Card className="p-5">
              <Tabs
                value={mode}
                onChange={setMode}
                options={[
                  { value: "signin", label: "Sign in" },
                  { value: "signup", label: "Create account" },
                ]}
                className="mb-5"
              />

              {mode === "signin" ? (
                <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4" noValidate>
                  <Field
                    label="Email address"
                    htmlFor="signin-email"
                    required
                    error={signInForm.formState.errors.email?.message}
                  >
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@organisation.gov"
                      aria-invalid={!!signInForm.formState.errors.email}
                      {...signInForm.register("email")}
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="signin-password"
                    required
                    error={signInForm.formState.errors.password?.message}
                  >
                    <Input
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      aria-invalid={!!signInForm.formState.errors.password}
                      {...signInForm.register("password")}
                    />
                  </Field>

                  <Button
                    type="submit"
                    className="w-full"
                    loading={signInForm.formState.isSubmitting}
                  >
                    Sign in
                  </Button>
                </form>
              ) : (
                <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4" noValidate>
                  <Field
                    label="Full name"
                    htmlFor="signup-name"
                    required
                    error={signUpForm.formState.errors.name?.message}
                  >
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      placeholder="Priya Sharma"
                      aria-invalid={!!signUpForm.formState.errors.name}
                      {...signUpForm.register("name")}
                    />
                  </Field>

                  <Field
                    label="Email address"
                    htmlFor="signup-email"
                    required
                    error={signUpForm.formState.errors.email?.message}
                  >
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@organisation.gov"
                      aria-invalid={!!signUpForm.formState.errors.email}
                      {...signUpForm.register("email")}
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="signup-password"
                    required
                    hint="At least 8 characters."
                    error={signUpForm.formState.errors.password?.message}
                  >
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      aria-invalid={!!signUpForm.formState.errors.password}
                      {...signUpForm.register("password")}
                    />
                  </Field>

                  <Field
                    label="Organisation"
                    htmlFor="signup-org"
                    hint="Optional."
                    error={signUpForm.formState.errors.organisation?.message}
                  >
                    <Input
                      id="signup-org"
                      placeholder="Municipal Environmental Department"
                      {...signUpForm.register("organisation")}
                    />
                  </Field>

                  <Button
                    type="submit"
                    className="w-full"
                    loading={signUpForm.formState.isSubmitting}
                  >
                    Create account
                  </Button>

                  <p className="text-[11px] leading-relaxed text-[var(--color-ink-subtle)]">
                    New accounts are created with the citizen role. Authority and analyst access is
                    granted by an administrator.
                  </p>
                </form>
              )}

              <Separator className="my-5" />

              <p className="text-center text-[11px] text-[var(--color-ink-muted)]">
                Intelligence pages are viewable without an account. Signing in is required to submit
                reports and act on alerts.{" "}
                <Link href="/dashboard" className="font-medium text-[var(--color-brand-700)] underline">
                  Continue as guest
                </Link>
              </p>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
