"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Field, InlineAlert, Input } from "@/components/ui";
import { ApiError, authApi } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: Values) => {
    setServerError(null);
    try {
      // The backend responds identically whether or not the address is
      // registered, so this request cannot be used to enumerate accounts.
      await authApi.forgotPassword(values.email);
      setSubmittedEmail(values.email);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : "Could not submit the request. Please try again.",
      );
    }
  };

  if (submittedEmail) {
    return (
      <AuthShell>
        <div className="auth-success">
          <span className="auth-success-icon" aria-hidden="true">
            <MailCheck size={28} />
          </span>
          <h1>Check your inbox</h1>
          <p>
            If an account exists for{" "}
            <span className="auth-success-email">{submittedEmail}</span>, we have sent
            instructions for resetting your password. The link expires in 60 minutes.
          </p>

          <InlineAlert variant="info">
            <strong>Prototype limitation:</strong> email delivery is simulated in this build.
            The reset link is written to the backend log rather than dispatched.
          </InlineAlert>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button asChild size="lg" block>
              <Link href="/login">Return to Sign In</Link>
            </Button>
            <Button
              variant="ghost"
              block
              onClick={() => setSubmittedEmail(null)}
            >
              Use a different email address
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-heading">
        <h1>Reset your password</h1>
        <p>
          Enter the email address associated with your account and we will send you a link to
          set a new password.
        </p>
      </div>

      {serverError ? <InlineAlert variant="error">{serverError}</InlineAlert> : null}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Email" htmlFor="forgot-email" required error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@organisation.org"
            autoComplete="email"
            autoFocus
          />
        </Field>

        <Button type="submit" size="lg" block loading={isSubmitting}>
          {!isSubmitting ? <Send size={17} aria-hidden="true" /> : null}
          {isSubmitting ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>

      <p className="auth-alt">
        <Link href="/login" className="auth-link">
          <ArrowLeft size={14} aria-hidden="true" style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
          Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}
