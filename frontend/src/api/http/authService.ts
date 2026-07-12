import type { AuthService } from "@/api/services";
import type { AuthSession, Credentials } from "@/types";
import { request } from "@/api/http";
import { jwtExpiry, toUser, type UserOut } from "./mappers";

interface TokenOut {
  access_token: string;
  token_type: string;
}

/**
 * Auth against the FastAPI backend. Login returns only a token, so we chain a
 * /auth/me call to hydrate the user. There is no logout endpoint — logout is
 * client-side only (clear the token).
 */
export const httpAuthService: AuthService = {
  async login(credentials: Credentials): Promise<AuthSession> {
    const { access_token } = await request<TokenOut>("/auth/login", {
      method: "POST",
      body: credentials,
    });
    const me = await request<UserOut>("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return { user: toUser(me), token: access_token, expiresAt: jwtExpiry(access_token) };
  },

  async logout(): Promise<void> {
    // No server session to invalidate; token is simply discarded client-side.
  },

  async restore(token: string): Promise<AuthSession> {
    const me = await request<UserOut>("/auth/me", { method: "GET" });
    return { user: toUser(me), token, expiresAt: jwtExpiry(token) };
  },

  async changePassword({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await request<void>("/auth/me/password", {
      method: "PATCH",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  },
};
