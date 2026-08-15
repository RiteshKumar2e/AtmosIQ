"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authApi } from "@/lib/api";
import {
  clearSession,
  getStoredUser,
  getToken,
  saveSession,
  subscribeToSession,
  updateStoredUser,
} from "@/lib/auth";
import type { Role, TokenResponse, User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  /** True until the stored session has been read on the client. */
  loading: boolean;
}

/**
 * Reads the session from storage and keeps it in sync across components and
 * browser tabs. Server-rendered output always starts unauthenticated, so the
 * markup matches on hydration.
 */
export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  const sync = useCallback(() => {
    setState({ user: getStoredUser(), token: getToken(), loading: false });
  }, []);

  useEffect(() => {
    sync();
    return subscribeToSession(sync);
  }, [sync]);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await authApi.login({ email, password });
      saveSession(payload);
      return payload;
    },
    [],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      role: Role;
      organisation?: string | null;
    }) => {
      const payload = await authApi.register(input);
      saveSession(payload);
      return payload;
    },
    [],
  );

  const demoLogin = useCallback(
    async (role: "authority" | "analyst" | "citizen" = "analyst") => {
      const payload: TokenResponse = await authApi.demoLogin(role);
      saveSession(payload);
      return payload;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // A failed call must never strand the user in a signed-in UI.
    }
    clearSession();
    router.push("/login");
  }, [router]);

  /** Re-fetch the profile from the API (used after a settings update). */
  const refresh = useCallback(async () => {
    try {
      const user = await authApi.me();
      updateStoredUser(user);
      return user;
    } catch {
      return null;
    }
  }, []);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: Boolean(state.token),
    login,
    register,
    demoLogin,
    logout,
    refresh,
  };
}
