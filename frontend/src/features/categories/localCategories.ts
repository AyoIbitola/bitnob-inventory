/**
 * Categories the admin created that no product uses yet.
 *
 * The backend has NO categories table — a category only exists as a string on a
 * product. So a brand-new, empty category has nowhere to live server-side. We
 * hold those here (localStorage) so they're immediately usable in the forms;
 * the moment a product uses one, it becomes "real" and this entry is redundant.
 *
 * ⚠️ Ask the backend for a proper /categories resource — then delete this file.
 */
const KEY = "bitvault.pendingCategories";

export const pendingCategories = {
  list(): string[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },
  add(name: string): void {
    const next = Array.from(new Set([...pendingCategories.list(), name]));
    localStorage.setItem(KEY, JSON.stringify(next));
  },
  remove(name: string): void {
    localStorage.setItem(
      KEY,
      JSON.stringify(pendingCategories.list().filter((c) => c !== name)),
    );
  },
};
