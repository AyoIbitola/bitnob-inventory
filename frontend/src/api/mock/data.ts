import { CURRENCY } from "@/config";
import type { Item, StockStatus, User } from "@/types";

/**
 * In-memory fixtures for offline development ONLY (VITE_USE_MOCK_API=true).
 * Reachable exclusively through the mock services. Never imported by components.
 */

export function deriveStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 10) return "low_stock";
  return "in_stock";
}

/** Demo users so role-based rendering can be exercised offline. */
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

function make(
  id: string,
  serialNumber: string,
  brand: string,
  modelNo: string,
  category: string,
  quantity: number,
  price: number,
  description: string,
): Item {
  return {
    id,
    serialNumber,
    brand,
    modelNo,
    category,
    description,
    quantity,
    price,
    currency: CURRENCY,
    status: deriveStatus(quantity),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 40).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}

export const mockItems: Item[] = [
  make("1", "SN-HDMI-001", "AmazonBasics", "HD100", "Cables", 12, 3500, "Braided HDMI cable, 2m, new condition."),
  make("2", "SN-MOUSE-001", "Logitech", "M185", "Peripherals", 8, 9500, "Black wireless mouse, good condition."),
  make("3", "SN-KB-004", "Keychron", "K2", "Peripherals", 0, 42000, "Mechanical keyboard, hot-swappable."),
  make("4", "SN-RTR-210", "TP-Link", "AX3000", "Networking", 24, 55000, "Wi-Fi 6 dual-band router."),
  make("5", "SN-SSD-512", "Samsung", "980 Pro", "Storage", 60, 78000, "512GB NVMe SSD."),
  make("6", "SN-CBL-USBC", "Anker", "PowerLine III", "Cables", 5, 6500, "USB-C to USB-C 100W cable."),
];
