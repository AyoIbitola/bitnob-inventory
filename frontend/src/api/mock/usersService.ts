import type { UsersService } from "@/api/services";
import type { User } from "@/types";
import { ApiError } from "@/api/http";
import { mockUsers } from "./data";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const mockUsersService: UsersService = {
  async list(): Promise<User[]> {
    await delay();
    return Object.values(mockUsers).map(({ password: _pw, ...u }) => u);
  },

  async setAdmin(id: string, isAdmin: boolean): Promise<User> {
    await delay();
    const entry = Object.values(mockUsers).find((u) => u.id === id);
    if (!entry) throw new ApiError(404, "User not found.");
    entry.role = isAdmin ? "admin" : "staff";
    const { password: _pw, ...safe } = entry;
    return safe;
  },
};
