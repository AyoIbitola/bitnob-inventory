import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsService } from "@/api";
import type { Item, ItemInput } from "@/types";

/** One query key backs the table, categories, summary and notifications. */
export const itemKeys = {
  all: ["items"] as const,
  detail: (id: string) => ["items", "detail", id] as const,
};

/**
 * The whole catalog. The backend has no pagination/summary/category endpoints,
 * so we fetch once and derive everything from this single cached list — one
 * request instead of three.
 */
export function useItems(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: itemKeys.all,
    queryFn: () => itemsService.list(),
    refetchInterval: options?.refetchInterval,
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: itemKeys.detail(id ?? ""),
    queryFn: () => itemsService.get(id as string),
    enabled: !!id,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ItemInput) => itemsService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ItemInput> }) =>
      itemsService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

/** Create many units of one product in a single action (one row per serial). */
export function useCreateUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: ItemInput[]) => {
      const created: Item[] = [];
      const failed: Array<{ serialNumber: string; message: string }> = [];
      // Sequential: the backend rejects duplicate serials, and we want to report
      // exactly which ones failed rather than aborting the whole batch.
      for (const input of inputs) {
        try {
          created.push(await itemsService.create(input));
        } catch (err) {
          failed.push({
            serialNumber: input.serialNumber,
            message: err instanceof Error ? err.message : "Failed",
          });
        }
      }
      return { created, failed };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

/** Bulk-rename a category by patching every unit that carries it. */
export function useRenameCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, to }: { items: Item[]; to: string }) => {
      for (const item of items) {
        await itemsService.update(item.id, { category: to });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

/** Upload a unit's image to the backend (Cloudinary). */
export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => itemsService.uploadImage(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

/** AI natural-language search (POST /search). Run on demand, not on keystroke. */
export function useAiSearch() {
  return useMutation({
    mutationFn: (query: string) => itemsService.aiSearch(query),
  });
}
