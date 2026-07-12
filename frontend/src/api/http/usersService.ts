import type { UsersService } from "@/api/services";
import type { User } from "@/types";
import { request } from "@/api/http";
import { toUser, type UserOut } from "./mappers";

/** Users admin (admin-gated on the backend). */
export const httpUsersService: UsersService = {
  async list(): Promise<User[]> {
    const users = await request<UserOut[]>("/users");
    return users.map(toUser);
  },

  async create(input: { email: string; password: string; isAdmin: boolean }): Promise<User> {
    const created = await request<UserOut>("/users", {
      method: "POST",
      body: { email: input.email, password: input.password, is_admin: input.isAdmin },
    });
    return toUser(created);
  },

  async setAdmin(id: string, isAdmin: boolean): Promise<User> {
    const updated = await request<UserOut>(`/users/${id}/admin`, {
      method: "PATCH",
      body: { is_admin: isAdmin },
    });
    return toUser(updated);
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await request<void>(`/users/${id}/password`, {
      method: "PATCH",
      body: { new_password: newPassword },
    });
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/users/${id}`, { method: "DELETE" });
  },
};
