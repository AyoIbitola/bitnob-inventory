import type { CategoriesService } from "@/api/services";
import type { CategoryEntry, CategoryInput, CategoryUpdateInput } from "@/types";
import { ApiError } from "@/api/http";
import { mockItems } from "./data";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/** Description/image/empty-category metadata, keyed by name (lowercased). */
const metadata = new Map<string, { name: string; description?: string; imageUrl?: string }>();

/** Unit counts/value are derived from the static fixture list — this mock
 * layer is a demo/offline stopgap, not the path exercised against the real
 * backend, so it doesn't track live mutations made through mockItemsService. */
function rollup(name: string) {
  const units = mockItems.filter((i) => i.category === name);
  return {
    units: units.length,
    totalValue: units.reduce((sum, u) => sum + (u.price ?? 0), 0),
  };
}

function toEntry(name: string): CategoryEntry {
  const meta = metadata.get(name.toLowerCase());
  return { name, ...rollup(name), description: meta?.description, imageUrl: meta?.imageUrl };
}

export const mockCategoriesService: CategoriesService = {
  async list(): Promise<CategoryEntry[]> {
    await delay();
    const names = new Set<string>();
    for (const item of mockItems) if (item.category) names.add(item.category);
    for (const m of metadata.values()) names.add(m.name);
    return [...names].sort((a, b) => a.localeCompare(b)).map(toEntry);
  },

  async create(input: CategoryInput): Promise<CategoryEntry> {
    await delay();
    const key = input.name.toLowerCase();
    if (metadata.has(key) || mockItems.some((i) => i.category?.toLowerCase() === key)) {
      throw new ApiError(400, "A category with that name already exists");
    }
    metadata.set(key, { name: input.name, description: input.description || undefined });
    return toEntry(input.name);
  },

  async update(name: string, input: CategoryUpdateInput): Promise<CategoryEntry> {
    await delay();
    const key = name.toLowerCase();
    const existing = metadata.get(key) ?? { name };
    const nextName = input.newName?.trim() || existing.name;
    if (input.description !== undefined) existing.description = input.description || undefined;
    existing.name = nextName;
    metadata.delete(key);
    metadata.set(nextName.toLowerCase(), existing);
    for (const item of mockItems) if (item.category === name) item.category = nextName;
    return toEntry(nextName);
  },

  async remove(name: string): Promise<void> {
    await delay();
    metadata.delete(name.toLowerCase());
    for (const item of mockItems) if (item.category === name) item.category = undefined;
  },

  async uploadImage(name: string, file: File): Promise<CategoryEntry> {
    await delay();
    const key = name.toLowerCase();
    const existing = metadata.get(key) ?? { name };
    existing.imageUrl = URL.createObjectURL(file);
    metadata.set(key, existing);
    return toEntry(existing.name);
  },

  async removeImage(name: string): Promise<CategoryEntry> {
    await delay();
    const existing = metadata.get(name.toLowerCase());
    if (existing) existing.imageUrl = undefined;
    return toEntry(name);
  },
};
