/**
 * Client-side session handling.
 *
 * The JWT is held in localStorage and attached by `lib/api.ts`. The dashboard
 * is additionally guarded at render time by `components/auth/AuthGuard.tsx`,
 * which redirects unauthenticated visitors to /login.
 */

import { TOKEN_KEY, USER_KEY } from "@/lib/constants";
import type { TokenResponse, User } from "@/types";

const SESSION_EVENT = "atmosiq:session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Token inspection                                                           */
/* -------------------------------------------------------------------------- */

interface JwtClaims {
  sub?: string;
  exp?: number;
  iat?: number;
  role?: string;
  email?: string;
}

/**
 * Read the claims out of a JWT without verifying it.
 *
 * The signature is the backend's business — this exists purely so the client
 * can notice an expired session before firing a request that is certain to be
 * rejected. Never trust these claims for an authorisation decision.
 */
export function decodeToken(token: string | null): JwtClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    // JWT uses base64url; atob needs standard base64 with padding.
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return null;
  }
}

/**
 * True when the token is absent, malformed, or past its `exp`.
 *
 * A small skew allowance stops a token that expires mid-flight from being
 * treated as valid a moment before the server rejects it.
 */
export function isTokenExpired(token: string | null, skewSeconds = 10): boolean {
  if (!token) return true;

  const claims = decodeToken(token);
  // Fail closed: a token we cannot decode, or one carrying no `exp`, is
  // treated as expired. Anything else would let a malformed value through the
  // dashboard guard only for every subsequent request to 401.
  if (!claims?.exp) return true;

  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

/** The stored token, or null when it is missing or already expired. */
export function getValidToken(): string | null {
  const token = getToken();
  return token && !isTokenExpired(token) ? token : null;
}

/** Milliseconds until the stored token expires; 0 when already expired. */
export function millisecondsUntilExpiry(token: string | null): number {
  const claims = decodeToken(token);
  if (!claims?.exp) return 0;
  return Math.max(0, claims.exp * 1000 - Date.now());
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveSession(payload: TokenResponse): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, payload.access_token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    notifySessionChange();
  } catch {
    /* Storage unavailable (private mode): the session lasts for this page only. */
  }
}

export function updateStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifySessionChange();
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    notifySessionChange();
  } catch {
    /* ignore */
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

/** Broadcast a session change so every mounted `useAuth()` re-reads storage. */
export function notifySessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSession(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, listener);
  // `storage` fires when another tab signs in or out.
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(SESSION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Roles permitted to act on alerts and run the demo simulation. */
export function canActOnAlerts(user: User | null): boolean {
  return Boolean(user && ["authority", "analyst", "admin"].includes(user.role));
}
