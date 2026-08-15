import { cn } from "@/lib/utils";

/**
 * Wordmark. The glyph is a shield split by an isobar-like sweep — a
 * protection mark crossed with an atmospheric contour, which reads as
 * environmental monitoring rather than generic security.
 */
export function Logo({
  className,
  showText = true,
  size = 24,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <path
          d="M12 2.5 4.5 5.4v6.3c0 4.6 3.1 8.9 7.5 10.3 4.4-1.4 7.5-5.7 7.5-10.3V5.4L12 2.5Z"
          fill="var(--color-brand-600)"
        />
        <path
          d="M6.6 10.4c1.9-1.1 3.4-.2 5.4.6 2 .8 3.5 1.4 5.4.3"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.95"
        />
        <path
          d="M6.9 14.3c1.7-.9 3-.2 4.7.5 1.7.7 3 1.1 4.6.2"
          stroke="white"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight text-[var(--color-ink)]">
          AeroShield
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-brand-600)]">
            BRICS
          </span>
        </span>
      )}
    </span>
  );
}
