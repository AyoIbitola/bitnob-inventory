import type { CategoriesService } from "@/api/services";
import type { CategoryEntry, CategoryInput, CategoryUpdateInput } from "@/types";
import { request, upload } from "@/api/http";
import { toCategoryEntry, toCategoryWrite, type CategoryOut } from "./mappers";

/** Category names can contain spaces (or, in principle, slashes) — always
 * encode before splicing one into a URL path segment. */
const path = (name: string) => `/categories/${encodeURIComponent(name)}`;

export const httpCategoriesService: CategoriesService = {
  async list(): Promise<CategoryEntry[]> {
    const categories = await request<CategoryOut[]>("/categories");
    return categories.map(toCategoryEntry);
  },

  async create(input: CategoryInput): Promise<CategoryEntry> {
    const category = await request<CategoryOut>("/categories", {
      method: "POST",
      body: { name: input.name, description: input.description || undefined },
    });
    return toCategoryEntry(category);
  },

  async update(name: string, input: CategoryUpdateInput): Promise<CategoryEntry> {
    const category = await request<CategoryOut>(path(name), {
      method: "PATCH",
      body: toCategoryWrite(input),
    });
    return toCategoryEntry(category);
  },

  async remove(name: string): Promise<void> {
    await request<void>(path(name), { method: "DELETE" });
  },

  async uploadImage(name: string, file: File): Promise<CategoryEntry> {
    return toCategoryEntry(await upload<CategoryOut>(`${path(name)}/image`, file));
  },

  async removeImage(name: string): Promise<CategoryEntry> {
    return toCategoryEntry(await request<CategoryOut>(`${path(name)}/image`, { method: "DELETE" }));
  },
};
