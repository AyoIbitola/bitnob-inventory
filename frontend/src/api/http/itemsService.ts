import type { ItemsService } from "@/api/services";
import type {
  AiSearchResult,
  Category,
  InventorySummary,
  Item,
  ItemInput,
  ItemQuery,
  Paginated,
} from "@/types";
import { CURRENCY, DEFAULT_PAGE_SIZE } from "@/config";
import { request } from "@/api/http";
import { toItem, toProductWrite, type ProductOut } from "./mappers";

/**
 * Products adapter. The backend `GET /products` returns a plain array and only
 * filters by `category` + `q`. Status filtering and pagination are therefore
 * applied here, client-side, so the UI's Paginated contract still holds. When
 * the backend adds real pagination, this is the only place that changes.
 */
async function fetchProducts(query: ItemQuery): Promise<Item[]> {
  const products = await request<ProductOut[]>("/products", {
    params: { category: query.category, q: query.search },
  });
  return products.map(toItem);
}

export const httpItemsService: ItemsService = {
  async list(query: ItemQuery): Promise<Paginated<Item>> {
    let items = await fetchProducts(query);

    // Status is derived client-side, so filter it here too.
    if (query.status) items = items.filter((i) => i.status === query.status);

    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;

    return { data: items.slice(start, start + pageSize), page, pageSize, total: items.length };
  },

  async get(id: string): Promise<Item> {
    const product = await request<ProductOut>(`/products/${id}`);
    return toItem(product);
  },

  async create(input: ItemInput): Promise<Item> {
    const product = await request<ProductOut>("/products", {
      method: "POST",
      body: toProductWrite(input),
    });
    return toItem(product);
  },

  async update(id: string, input: ItemInput): Promise<Item> {
    const product = await request<ProductOut>(`/products/${id}`, {
      method: "PATCH",
      body: toProductWrite(input),
    });
    return toItem(product);
  },

  async remove(id: string): Promise<void> {
    await request<void>(`/products/${id}`, { method: "DELETE" });
  },

  async uploadImage(id: string, file: File): Promise<Item> {
    const form = new FormData();
    form.append("file", file);
    const product = await request<ProductOut>(`/products/${id}/image`, {
      method: "POST",
      body: form,
    });
    return toItem(product);
  },

  async removeImage(id: string): Promise<Item> {
    const product = await request<ProductOut>(`/products/${id}/image`, { method: "DELETE" });
    return toItem(product);
  },

  async categories(): Promise<Category[]> {
    // No categories endpoint — derive distinct categories from the catalog.
    const items = await fetchProducts({});
    const names = Array.from(
      new Set(items.map((i) => i.category).filter((c): c is string => !!c)),
    ).sort();
    return names.map((name) => ({ id: name, name }));
  },

  async summary(): Promise<InventorySummary> {
    // No summary endpoint — derive from the full catalog.
    const items = await fetchProducts({});
    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
      currency: CURRENCY,
      lowStock: items.filter((i) => i.status === "low_stock").length,
      outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    };
  },

  async aiSearch(query: string): Promise<AiSearchResult> {
    const res = await request<{ answer: string; matched_products: ProductOut[] }>("/search", {
      method: "POST",
      body: { query },
    });
    return { answer: res.answer, items: (res.matched_products ?? []).map(toItem) };
  },
};
