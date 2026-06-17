"use client";

import * as React from "react";
import type { AuthSession } from "@/features/auth/types/auth-session";
import { apiClient } from "@/lib/api/client";
import {
  clearAuthSession,
  loadAuthSession,
  saveAuthSession,
} from "@/lib/auth/session";

const AUTO_FINGERPRINT_DISABLED_KEY = "school_erp_login_auto_fingerprint_disabled";

type AuthContextValue = {
  session: AuthSession | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    setSession(loadAuthSession());
    setIsHydrated(true);
  }, []);

  const signIn = React.useCallback((nextSession: AuthSession) => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTO_FINGERPRINT_DISABLED_KEY);
    }

    saveAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const signOut = React.useCallback(() => {
    void apiClient.logout().catch(() => undefined);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUTO_FINGERPRINT_DISABLED_KEY, "1");
    }

    clearAuthSession();
    setSession(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrated,
      isAuthenticated: Boolean(session?.accessToken),
      signIn,
      signOut,
    }),
    [session, isHydrated, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("يجب استخدام useAuth داخل AuthProvider.");
  }

  return context;
}




