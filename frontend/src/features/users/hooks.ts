import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, usersService } from "@/api";
import type { Credentials } from "@/types";

const usersKey = ["users"] as const;

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: () => usersService.list() });
}

export function useSetAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      usersService.setAdmin(id, isAdmin),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

/** Admin-creates a user via /auth/register (does NOT change the admin's session). */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) => authService.register(credentials),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}
