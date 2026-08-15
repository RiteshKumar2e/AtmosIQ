"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (payload: {
    name: string;
    email: string;
    password: string;
    organisation?: string;
  }) => Promise<User>;
  demoSignIn: (role: "authority" | "analyst" | "citizen") => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore an existing session on first mount.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        // Token expired or the backend is unreachable — start signed out
        // rather than trapping the user on a broken screen.
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const signUp = useCallback(
    async (payload: { name: string; email: string; password: string; organisation?: string }) => {
      const response = await api.register(payload);
      setToken(response.access_token);
      setUser(response.user);
      return response.user;
    },
    [],
  );

  const demoSignIn = useCallback(async (role: "authority" | "analyst" | "citizen") => {
    const response = await api.demoLogin(role);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // A failed logout call must never strand a signed-in session on the
      // client; clearing the local token is what actually ends the session.
    }
    setToken(null);
    setUser(null);
    router.push("/");
  }, [router]);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      setUser(await api.me());
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, signIn, signUp, demoSignIn, signOut, refresh }),
    [user, loading, signIn, signUp, demoSignIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}

/** Roles permitted to act on alerts and run the demo scenario. */
export function canOperate(user: User | null): boolean {
  return !!user && ["authority", "analyst", "admin"].includes(user.role);
}
