import type { ItemsService } from "@/api/services";
import type { AiSearchResult, Item, ItemInput } from "@/types";
import { ApiError } from "@/api/http";
import { mockItems } from "./data";
import { itemDisplayName } from "@/lib/format";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

let items: Item[] = [...mockItems];

export const mockItemsService: ItemsService = {
  async list(): Promise<Item[]> {
    await delay();
    return [...items];
  },

  async get(id: string): Promise<Item> {
    await delay(200);
    const item = items.find((i) => i.id === id);
    if (!item) throw new ApiError(404, "Item not found.");
    return item;
  },

  async create(input: ItemInput): Promise<Item> {
    await delay();
    // Mirror the backend's UNIQUE serial_number constraint.
    if (items.some((i) => i.serialNumber === input.serialNumber)) {
      throw new ApiError(400, "Product with this serial number already exists");
    }
    const item: Item = {
      ...input,
      id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    items = [item, ...items];
    return item;
  },

  async update(id: string, input: Partial<ItemInput>): Promise<Item> {
    await delay();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new ApiError(404, "Item not found.");
    const updated: Item = { ...items[index], ...input, updatedAt: new Date().toISOString() };
    items = items.map((i) => (i.id === id ? updated : i));
    return updated;
  },

  async remove(id: string): Promise<void> {
    await delay();
    if (!items.some((i) => i.id === id)) throw new ApiError(404, "Item not found.");
    items = items.filter((i) => i.id !== id);
  },

  async uploadImage(id: string, file: File): Promise<Item> {
    await delay();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new ApiError(404, "Item not found.");
    const updated = { ...items[index], imageUrl: URL.createObjectURL(file) };
    items = items.map((i) => (i.id === id ? updated : i));
    return updated;
  },

  async aiSearch(query: string): Promise<AiSearchResult> {
    await delay(700);
    const q = query.toLowerCase();
    const matched = items.filter((i) =>
      `${itemDisplayName(i)} ${i.category ?? ""} ${i.description ?? ""} ${i.serialNumber}`
        .toLowerCase()
        .includes(q),
    );
    return {
      answer: matched.length
        ? `Found ${matched.length} unit(s) matching “${query}”.`
        : `No units matched “${query}”.`,
      items: matched,
    };
  },
};
