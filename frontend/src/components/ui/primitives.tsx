"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/* ==========================================================================
   Button
   ========================================================================== */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors " +
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 " +
    "focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] " +
    "whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] " +
          "active:bg-[var(--color-brand-800)]",
        secondary:
          "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line-strong)] " +
          "hover:bg-[var(--color-surface-sunken)]",
        ghost:
          "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]",
        danger:
          "bg-[var(--color-risk-critical)] text-white hover:brightness-95 active:brightness-90",
        outline:
          "border border-[var(--color-brand-300)] text-[var(--color-brand-700)] " +
          "bg-[var(--color-brand-50)] hover:bg-[var(--color-brand-100)]",
        link: "text-[var(--color-brand-600)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ==========================================================================
   Card
   ========================================================================== */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-line)] " +
          "bg-[var(--color-surface)] shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
  icon,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 shrink-0 text-[var(--color-ink-subtle)]" aria-hidden>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/* ==========================================================================
   Badge
   ========================================================================== */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded font-medium border whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral:
          "bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)] border-[var(--color-line)]",
        brand:
          "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border-[var(--color-brand-200)]",
        info: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[var(--color-info-line)]",
        low: "bg-[var(--color-risk-low-soft)] text-[var(--color-risk-low)] border-[var(--color-risk-low-line)]",
        moderate:
          "bg-[var(--color-risk-moderate-soft)] text-[var(--color-risk-moderate)] border-[var(--color-risk-moderate-line)]",
        high: "bg-[var(--color-risk-high-soft)] text-[var(--color-risk-high)] border-[var(--color-risk-high-line)]",
        critical:
          "bg-[var(--color-risk-critical-soft)] text-[var(--color-risk-critical)] border-[var(--color-risk-critical-line)]",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/* ==========================================================================
   Form controls
   ========================================================================== */
export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("block text-xs font-medium text-[var(--color-ink)]", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--color-risk-critical)]" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}

const fieldStyles =
  "w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] " +
  "px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] " +
  "transition-colors focus:border-[var(--color-brand-400)] " +
  "disabled:cursor-not-allowed disabled:bg-[var(--color-surface-sunken)] " +
  "aria-[invalid=true]:border-[var(--color-risk-critical)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldStyles, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldStyles, "min-h-24 py-2 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldStyles, "h-9 cursor-pointer pr-8", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-[var(--color-risk-critical)]">
      {message}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-[var(--color-ink-subtle)]">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

/* ==========================================================================
   Skeleton / loading
   ========================================================================== */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-[var(--color-surface-sunken)]",
        className,
      )}
      aria-hidden
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[var(--animate-sweep)] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-3" style={{ width: `${92 - index * 14}%` }} />
        ))}
      </div>
    </Card>
  );
}

/* ==========================================================================
   Progress / meter
   ========================================================================== */
export function Meter({
  value,
  max = 100,
  color,
  className,
  label,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]", className)}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color ?? "var(--color-brand-500)" }}
      />
    </div>
  );
}

/* ==========================================================================
   Tabs (uncontrolled-friendly, keyboard accessible)
   ========================================================================== */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-card)]"
                : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="ml-1.5 text-[var(--color-ink-subtle)] tabular">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   States: empty / error
   ========================================================================== */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[var(--color-ink-subtle)]"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Could not load this data",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-risk-critical-line)] bg-[var(--color-risk-critical-soft)] px-6 py-8 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--color-risk-critical)]">{title}</p>
      {message && (
        <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--color-ink-muted)]">
          {message}
        </p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ==========================================================================
   Tooltip — CSS-only, no dependency, keyboard reachable
   ========================================================================== */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <button
        type="button"
        aria-label={text}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--color-line-strong)] text-[9px] font-semibold text-[var(--color-ink-subtle)] hover:border-[var(--color-ink-subtle)] hover:text-[var(--color-ink-muted)]"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--color-ink-muted)] opacity-0 shadow-[var(--shadow-overlay)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/* ==========================================================================
   Separator
   ========================================================================== */
export function Separator({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-[var(--color-line)]", className)} />;
}
