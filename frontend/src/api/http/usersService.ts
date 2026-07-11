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

  async setAdmin(id: string, isAdmin: boolean): Promise<User> {
    const updated = await request<UserOut>(`/users/${id}/admin`, {
      method: "PATCH",
      body: { is_admin: isAdmin },
    });
    return toUser(updated);
  },
};
