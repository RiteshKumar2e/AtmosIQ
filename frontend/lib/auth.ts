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
