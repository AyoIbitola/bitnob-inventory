import type { Item, User } from "@/types";

/**
 * In-memory fixtures for offline development ONLY (VITE_USE_MOCK_API=true).
 * Each entry is ONE physical unit with its own serial (matching the backend's
 * unique-serial constraint), so grouping behaves exactly like production.
 */

export const mockUsers: Record<string, User & { password: string }> = {
  "admin@bitnob.com": {
    id: "1",
    name: "admin@bitnob.com",
    email: "admin@bitnob.com",
    role: "admin",
    initials: "AD",
    password: "admin123",
  },
  "staff@bitnob.com": {
    id: "2",
    name: "staff@bitnob.com",
    email: "staff@bitnob.com",
    role: "staff",
    initials: "ST",
    password: "staff123",
  },
};

let seq = 0;

/** Create `count` distinct units of one product, each with its own serial. */
function units(
  brand: string,
  modelNo: string,
  category: string,
  price: number,
  description: string,
  serialPrefix: string,
  count: number,
): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(++seq),
    serialNumber: `${serialPrefix}-${String(i + 1).padStart(3, "0")}`,
    brand,
    modelNo,
    category,
    description,
    price,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 20).toISOString(),
  }));
}

export const mockItems: Item[] = [
  ...units("Logitech", "M185", "Peripherals", 9500, "Black wireless mouse.", "SN-MOUSE", 8),
  ...units("AmazonBasics", "HD100", "Cables", 3500, "Braided HDMI cable, 2m.", "SN-HDMI", 20),
  ...units("Airtel", "M185", "Networking", 40000, "4G LTE router.", "AR-234001", 2),
  ...units("Keychron", "K2", "Peripherals", 42000, "Mechanical keyboard.", "SN-KB", 5),
  ...units("Samsung", "980 Pro", "Storage", 78000, "512GB NVMe SSD.", "SN-SSD", 14),
];
