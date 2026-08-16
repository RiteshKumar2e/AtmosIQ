"use client";

/**
 * Last-resort boundary for failures in the root layout itself.
 *
 * It replaces <html>, so the app stylesheet is not guaranteed to be present —
 * every style here is inline and self-contained.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f6f8f8",
          color: "#16211f",
          fontFamily:
            '"Inter", "Segoe UI", system-ui, -apple-system, Arial, sans-serif',
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "#b3372c",
            }}
          >
            AtmosIQ
          </p>
          <h1
            style={{
              margin: "0 0 12px",
              fontSize: 26,
              fontWeight: 650,
              letterSpacing: "-0.03em",
            }}
          >
            The application failed to start.
          </h1>
          <p
            style={{
              margin: "0 0 24px",
              fontSize: 15,
              lineHeight: 1.65,
              color: "#4a5c61",
            }}
          >
            An unrecoverable error occurred while loading AtmosIQ. Reloading usually
            resolves it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 22px",
              border: "none",
              borderRadius: 8,
              background: "#0f6f66",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload AtmosIQ
          </button>
          {error.digest ? (
            <p style={{ marginTop: 18, fontSize: 12, color: "#64777c" }}>
              Reference {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
