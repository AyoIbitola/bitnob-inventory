import type { AuthService } from "@/api/services";
import type { AuthSession, Credentials, User } from "@/types";
import { ApiError } from "@/api/http";
import { initialsFrom } from "@/lib/format";
import { mockUsers } from "./data";

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

/** Encode a fake token that the mock restore() can decode. Not secure — dev only. */
const tokenFor = (email: string) => `mock.${btoa(email)}`;
const emailFromToken = (token: string) => {
  try {
    return atob(token.replace(/^mock\./, ""));
  } catch {
    return "";
  }
};

export const mockAuthService: AuthService = {
  async login({ email, password }: Credentials) {
    await delay();
    const user = mockUsers[email.toLowerCase()];
    if (!user || user.password !== password) {
      throw new ApiError(401, "Invalid email or password.");
    }
    const { password: _pw, ...safeUser } = user;
    return {
      user: safeUser,
      token: tokenFor(user.email),
      expiresAt: Date.now() + 1000 * 60 * 60, // 1h
    } satisfies AuthSession;
  },

  async logout() {
    await delay(150);
  },

  async restore(token: string) {
    await delay(200);
    const email = emailFromToken(token);
    const user = mockUsers[email];
    if (!user) throw new ApiError(401, "Session expired.");
    const { password: _pw, ...safeUser } = user;
    return { user: safeUser, token, expiresAt: Date.now() + 1000 * 60 * 60 };
  },

  async register({ email, password }: Credentials): Promise<User> {
    await delay();
    const key = email.toLowerCase();
    if (mockUsers[key]) throw new ApiError(400, "Email already registered");
    const user: User & { password: string } = {
      id: String(Object.keys(mockUsers).length + 1),
      name: email,
      email,
      role: "staff", // new accounts are always non-admin
      initials: initialsFrom(email.split("@")[0] ?? email),
      password,
    };
    mockUsers[key] = user;
    const { password: _pw, ...safeUser } = user;
    return safeUser;
  },

  async changePassword({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    await delay();
    const entry = Object.values(mockUsers).find((u) => u.password === currentPassword);
    if (!entry) throw new ApiError(401, "Current password is incorrect");
    entry.password = newPassword;
  },
};
