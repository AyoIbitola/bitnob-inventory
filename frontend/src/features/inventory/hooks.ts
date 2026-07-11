import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsService } from "@/api";
import type { ItemInput, ItemQuery } from "@/types";

/**
 * Query-key factory — centralizing keys keeps cache invalidation consistent and
 * refactor-safe. Consumers never hand-write string keys.
 */
export const itemKeys = {
  all: ["items"] as const,
  list: (query: ItemQuery) => ["items", "list", query] as const,
  detail: (id: string) => ["items", "detail", id] as const,
  categories: ["categories"] as const,
};

/** Paginated + filtered item list. `keepPreviousData` avoids table flicker on page change. */
export function useItems(query: ItemQuery) {
  return useQuery({
    queryKey: itemKeys.list(query),
    queryFn: () => itemsService.list(query),
    placeholderData: (prev) => prev,
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: itemKeys.detail(id ?? ""),
    queryFn: () => itemsService.get(id as string),
    enabled: !!id,
  });
}

/** Full catalog (backend returns all products anyway) — used by the Categories
 *  and Reports views for client-side aggregation. */
export function useAllItems() {
  return useQuery({
    queryKey: ["items", "all"] as const,
    queryFn: () => itemsService.list({ page: 1, pageSize: 10_000 }).then((r) => r.data),
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: ["items", "summary"] as const,
    queryFn: () => itemsService.summary(),
    staleTime: 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: itemKeys.categories,
    queryFn: () => itemsService.categories(),
    staleTime: 5 * 60 * 1000, // categories rarely change
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
    mutationFn: ({ id, input }: { id: string; input: ItemInput }) =>
      itemsService.update(id, input),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: itemKeys.all });
      qc.setQueryData(itemKeys.detail(updated.id), updated);
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => itemsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: itemKeys.all }),
  });
}

/** AI natural-language search (POST /search). Run on demand, not on keystroke. */
export function useAiSearch() {
  return useMutation({
    mutationFn: (query: string) => itemsService.aiSearch(query),
  });
}
