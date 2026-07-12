import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/api";

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

/** Admin deletes an account. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}

/** Admin resets another user's password — the recovery path for a forgotten one. */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      usersService.resetPassword(id, newPassword),
  });
}

/** Admin-provisions an account directly (POST /users, admin-only). Does NOT
 *  change the admin's own session. */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; isAdmin: boolean }) =>
      usersService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKey }),
  });
}
