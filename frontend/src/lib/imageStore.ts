/**
 * Local image store — a fallback for when Cloudinary upload fails (e.g. a 503
 * from the media backend). Every unit's real photo lives server-side on
 * `image_url`; this just downscales and keeps a local copy in localStorage
 * keyed by unit id so the upload isn't silently lost.
 *
 * ⚠️ Limitations (flagged in DESIGN-NOTES): images stored here live only in
 * the browser that uploaded them — they are NOT shared across users/devices
 * and don't survive a cache clear.
 */

import type { Item } from "@/types";

const PREFIX = "bitvault.img.";
const MAX_DIM = 512; // px — keep localStorage footprint small

export const imageStore = {
  get(id: string): string | null {
    try {
      return localStorage.getItem(PREFIX + id);
    } catch {
      return null;
    }
  },
  set(id: string, dataUrl: string): void {
    try {
      localStorage.setItem(PREFIX + id, dataUrl);
    } catch {
      /* quota exceeded — ignore, image just won't persist */
    }
  },
  remove(id: string): void {
    try {
      localStorage.removeItem(PREFIX + id);
    } catch {
      /* no-op */
    }
  },
};

/** A unit's own photo: server URL first, falling back to the local copy. */
export function resolveUnitImage(unit: Item): string | null {
  return unit.imageUrl ?? imageStore.get(unit.id) ?? null;
}

/**
 * Every unit has its own photo, so a product made of several units has no
 * single "correct" image. Represent the group with the first unit that has
 * one (stable regardless of unit ordering changes) rather than hiding all
 * images just because there's more than one unit.
 */
export function resolveGroupImage(units: Item[]): string | null {
  for (const unit of units) {
    const img = resolveUnitImage(unit);
    if (img) return img;
  }
  return null;
}

/** Read a File, downscale it to a JPEG data URL (bounded by MAX_DIM). */
export function fileToDownscaledDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
