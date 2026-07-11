import type { ItemsService } from "@/api/services";
import type { AiSearchResult, Item, ItemInput, ItemQuery, Paginated } from "@/types";
import { ApiError } from "@/api/http";
import { CURRENCY, DEFAULT_PAGE_SIZE } from "@/config";
import { deriveStatus, mockItems } from "./data";
import { itemDisplayName } from "@/lib/format";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

let items: Item[] = [...mockItems];

export const mockItemsService: ItemsService = {
  async list(query: ItemQuery): Promise<Paginated<Item>> {
    await delay();
    const search = query.search?.trim().toLowerCase();

    let filtered = items.filter((item) => {
      if (query.category && item.category !== query.category) return false;
      if (query.status && item.status !== query.status) return false;
      if (search) {
        const haystack =
          `${itemDisplayName(item)} ${item.serialNumber} ${item.category ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    filtered = filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
  },

  async get(id: string): Promise<Item> {
    await delay(250);
    const item = items.find((i) => i.id === id);
    if (!item) throw new ApiError(404, "Item not found.");
    return item;
  },

  async create(input: ItemInput): Promise<Item> {
    await delay();
    const item: Item = {
      ...input,
      id: `mock-${Date.now()}`,
      currency: CURRENCY,
      status: deriveStatus(input.quantity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items = [item, ...items];
    return item;
  },

  async update(id: string, input: ItemInput): Promise<Item> {
    await delay();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new ApiError(404, "Item not found.");
    const updated: Item = {
      ...items[index],
      ...input,
      status: deriveStatus(input.quantity),
      updatedAt: new Date().toISOString(),
    };
    items = items.map((i) => (i.id === id ? updated : i));
    return updated;
  },

  async remove(id: string): Promise<void> {
    await delay();
    if (!items.some((i) => i.id === id)) throw new ApiError(404, "Item not found.");
    items = items.filter((i) => i.id !== id);
  },

  async categories() {
    await delay(150);
    const names = Array.from(
      new Set(items.map((i) => i.category).filter((c): c is string => !!c)),
    ).sort();
    return names.map((name) => ({ id: name, name }));
  },

  async summary() {
    await delay(200);
    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
      currency: CURRENCY,
      lowStock: items.filter((i) => i.status === "low_stock").length,
      outOfStock: items.filter((i) => i.status === "out_of_stock").length,
    };
  },

  async aiSearch(query: string): Promise<AiSearchResult> {
    await delay(700);
    const q = query.toLowerCase();
    const matched = items.filter((i) =>
      `${itemDisplayName(i)} ${i.category ?? ""} ${i.description ?? ""}`.toLowerCase().includes(q),
    );
    return {
      answer: matched.length
        ? `Found ${matched.length} item(s) matching “${query}”.`
        : `No items matched “${query}”.`,
      items: matched,
    };
  },
};
