/**
 * Local image store — a STOPGAP until the backend adds an image field to
 * Product. Admin-uploaded images are downscaled and kept in localStorage keyed
 * by item id, then displayed in the table and detail panel.
 *
 * ⚠️ Limitations (flagged in DESIGN-NOTES): images live only in the browser
 * that uploaded them — they are NOT shared across users/devices and don't
 * survive a cache clear. When the backend exposes `image_url` (+ an upload or
 * storage endpoint), move this into the api layer and drop localStorage.
 */

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
