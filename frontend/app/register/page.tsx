"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { Button, Field, InlineAlert, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { ApiError } from "@/lib/api";
import { USER_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter your full name")
      .max(120, "Name must be 120 characters or fewer"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be 72 characters or fewer")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    organisation: z
      .string()
      .trim()
      .max(160, "Organization must be 160 characters or fewer")
      .optional()
      .or(z.literal("")),
    role: z.enum(["citizen", "analyst", "authority"]),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

/** Simple strength heuristic used only to guide the user, never to gate submission. */
function passwordStrength(password: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { score: 0, label: "Enter a password" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak — add length and a number" };
  if (score <= 3) return { score: 2, label: "Fair — a symbol would strengthen it" };
  return { score: 3, label: "Strong password" };
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { register: registerUser } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      organisation: "",
      role: "citizen",
    },
  });

  const selectedRole = watch("role");
  const password = watch("password");
  const strength = passwordStrength(password ?? "");

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      const session = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role as Role,
        organisation: values.organisation || null,
      });
      toast.success("Account created", `Welcome to AtmosIQ, ${session.user.name}.`);
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Registration failed. Please try again.";
      setServerError(message);
    }
  };

  return (
    <AuthShell>
      <div className="auth-heading">
        <h1>Create Your Account</h1>
        <p>Join AtmosIQ to report pollution events and access the intelligence platform.</p>
      </div>

      {serverError ? <InlineAlert variant="error">{serverError}</InlineAlert> : null}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Full Name" htmlFor="register-name" required error={errors.name?.message}>
          <Input {...register("name")} placeholder="Priya Raghavan" autoComplete="name" />
        </Field>

        <Field label="Email" htmlFor="register-email" required error={errors.email?.message}>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@organisation.org"
            autoComplete="email"
          />
        </Field>

        <div className="field">
          <label className="field-label" htmlFor="register-password">
            Password
            <span className="field-required" aria-hidden="true">
              *
            </span>
          </label>
          <div className="input-group">
            <Input
              {...register("password")}
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby="register-password-strength"
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

          <div className="password-meter" aria-hidden="true">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={cn(
                  "password-meter-bar",
                  strength.score >= level &&
                    (strength.score === 1
                      ? "is-weak"
                      : strength.score === 2
                        ? "is-fair"
                        : "is-strong"),
                )}
              />
            ))}
          </div>
          <p className="password-meter-label" id="register-password-strength">
            {strength.label}
          </p>

          {errors.password ? (
            <span className="field-error" role="alert">
              {errors.password.message}
            </span>
          ) : null}
        </div>

        <Field
          label="Confirm Password"
          htmlFor="register-confirm"
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            {...register("confirmPassword")}
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            autoComplete="new-password"
          />
        </Field>

        <Field
          label="Organization"
          htmlFor="register-organisation"
          hint="Optional — the agency, institution or company you represent."
          error={errors.organisation?.message}
        >
          <Input
            {...register("organisation")}
            placeholder="Central Pollution Control Board"
            autoComplete="organization"
          />
        </Field>

        <div className="field">
          <span className="field-label" id="register-role-label">
            Role
            <span className="field-required" aria-hidden="true">
              *
            </span>
          </span>

          <div className="role-options" role="radiogroup" aria-labelledby="register-role-label">
            {USER_ROLES.map((role) => (
              <label
                key={role.value}
                className={cn("role-option", selectedRole === role.value && "is-selected")}
                htmlFor={`role-${role.value}`}
              >
                <input
                  id={`role-${role.value}`}
                  type="radio"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={() => setValue("role", role.value, { shouldValidate: true })}
                  name="role"
                />
                <span>
                  <span className="role-option-title">{role.label}</span>
                  <span className="role-option-text">{role.description}</span>
                </span>
              </label>
            ))}
          </div>

          <span className="field-hint">
            Authority accounts are verified by an administrator before alert actions are
            enabled.
          </span>
        </div>

        <Button type="submit" size="lg" block loading={isSubmitting}>
          {!isSubmitting ? <UserPlus size={17} aria-hidden="true" /> : null}
          {isSubmitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="auth-alt">
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>

      <p className="auth-legal">
        By creating an account you agree that submitted observations may be used to generate
        environmental risk intelligence for responding authorities.
      </p>
    </AuthShell>
  );
}
