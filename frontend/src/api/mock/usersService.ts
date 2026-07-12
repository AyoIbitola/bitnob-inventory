import type { UsersService } from "@/api/services";
import type { User } from "@/types";
import { ApiError } from "@/api/http";
import { initialsFrom } from "@/lib/format";
import { mockUsers } from "./data";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const mockUsersService: UsersService = {
  async list(): Promise<User[]> {
    await delay();
    return Object.values(mockUsers).map(({ password: _pw, ...u }) => u);
  },

  async create(input: { email: string; password: string; isAdmin: boolean }): Promise<User> {
    await delay();
    const key = input.email.toLowerCase();
    if (mockUsers[key]) throw new ApiError(400, "Email already registered");
    const user: User & { password: string } = {
      id: String(Object.keys(mockUsers).length + 1),
      name: input.email,
      email: input.email,
      role: input.isAdmin ? "admin" : "staff",
      initials: initialsFrom(input.email.split("@")[0] ?? input.email),
      password: input.password,
    };
    mockUsers[key] = user;
    const { password: _pw, ...safe } = user;
    return safe;
  },

  async setAdmin(id: string, isAdmin: boolean): Promise<User> {
    await delay();
    const entry = Object.values(mockUsers).find((u) => u.id === id);
    if (!entry) throw new ApiError(404, "User not found.");
    entry.role = isAdmin ? "admin" : "staff";
    const { password: _pw, ...safe } = entry;
    return safe;
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await delay();
    const entry = Object.values(mockUsers).find((u) => u.id === id);
    if (!entry) throw new ApiError(404, "User not found.");
    entry.password = newPassword;
  },

  async remove(id: string): Promise<void> {
    await delay();
    const key = Object.keys(mockUsers).find((k) => mockUsers[k].id === id);
    if (!key) throw new ApiError(404, "User not found.");
    delete mockUsers[key];
  },
};
