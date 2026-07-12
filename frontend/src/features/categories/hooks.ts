import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "@/api";
import { itemKeys } from "@/features/inventory/hooks";
import type { CategoryInput, CategoryUpdateInput } from "@/types";

const categoriesKey = ["categories"] as const;

/** Renaming a category also changes every product that carries it, so both
 * caches need invalidating together or the inventory table goes stale. */
function invalidateBoth(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: categoriesKey });
  qc.invalidateQueries({ queryKey: itemKeys.all });
}

export function useCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: () => categoriesService.list() });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => categoriesService.create(input),
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, input }: { name: string; input: CategoryUpdateInput }) =>
      categoriesService.update(name, input),
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => categoriesService.remove(name),
    onSuccess: () => invalidateBoth(qc),
  });
}

export function useUploadCategoryImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, file }: { name: string; file: File }) =>
      categoriesService.uploadImage(name, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useRemoveCategoryImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => categoriesService.removeImage(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriesKey }),
  });
}
