import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { authService, registerTokenProvider, registerUnauthorizedHandler } from "@/api";
import type { AuthSession, Credentials, Role, User } from "@/types";

const TOKEN_STORAGE_KEY = "bitvault.token";

interface AuthContextValue {
  user: User | null;
  /** True while restoring a persisted session on boot. */
  initializing: boolean;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  /** Convenience role check used by guards and conditional UI. */
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns auth state and token lifecycle. The token is held in a ref (source of
 * truth for the http layer) and mirrored to localStorage for persistence.
 *
 * NOTE: localStorage is a pragmatic choice for an internal tool; if XSS risk
 * profile tightens, move to httpOnly cookies handled by the backend — that's a
 * change isolated to this file + the http layer. Flagged in DESIGN-NOTES.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const tokenRef = useRef<string | null>(null);

  // Give the http client a way to read the current token without importing React.
  useEffect(() => {
    registerTokenProvider(() => tokenRef.current);
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    tokenRef.current = session.token;
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  // Any 401 from the API (expired/invalid token) ends the session immediately,
  // so the user is sent to /login instead of hitting silent failures.
  useEffect(() => {
    registerUnauthorizedHandler(() => clearSession());
  }, [clearSession]);

  // Restore a persisted session on first mount.
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setInitializing(false);
      return;
    }
    tokenRef.current = stored;
    let active = true;
    authService
      .restore(stored)
      .then((session) => {
        if (active) applySession(session);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const login = useCallback(
    async (credentials: Credentials) => {
      const session = await authService.login(credentials);
      applySession(session);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    void authService.logout().catch(() => {
      /* best-effort; local session is cleared regardless */
    });
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      login,
      logout,
      hasRole: (role: Role) => user?.role === role,
    }),
    [user, initializing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
