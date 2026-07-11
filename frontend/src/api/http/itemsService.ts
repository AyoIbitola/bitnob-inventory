import type { ItemsService } from "@/api/services";
import type { AiSearchResult, Item, ItemInput } from "@/types";
import { request } from "@/api/http";
import { toItem, toProductWrite, type ProductOut } from "./mappers";

/**
 * Products adapter. The backend returns a plain array with no pagination, so we
 * fetch the catalog once; grouping, search, filtering, paging and the dashboard
 * summary are all derived from it client-side.
 *
 * ⚠️ Scale: when the catalog outgrows a single response, ask the backend for
 * pagination + server-side search and narrow this adapter accordingly.
 */
export const httpItemsService: ItemsService = {
  async list(): Promise<Item[]> {
    const products = await request<ProductOut[]>("/products");
    return products.map(toItem);
  },

  async get(id: string): Promise<Item> {
    return toItem(await request<ProductOut>(`/products/${id}`));
  },

  async create(input: ItemInput): Promise<Item> {
    const product = await request<ProductOut>("/products", {
      method: "POST",
      body: toProductWrite(input),
    });
    return toItem(product);
  },

  async update(id: string, input: Partial<ItemInput>): Promise<Item> {
    const product = await request<ProductOut>(`/products/${id}`, {
      method: "PATCH",
      body: toProductWrite(input),
    });
    return toItem(product);
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/products/${id}`, { method: "DELETE" });
  },

  async aiSearch(query: string): Promise<AiSearchResult> {
    const res = await request<{ answer: string; matched_products: ProductOut[] }>("/search", {
      method: "POST",
      body: { query },
    });
    return { answer: res.answer, items: (res.matched_products ?? []).map(toItem) };
  },
};
