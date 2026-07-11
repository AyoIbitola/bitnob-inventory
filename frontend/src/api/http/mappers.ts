import { CURRENCY } from "@/config";
import type { Item, ItemInput, Role, StockStatus, User } from "@/types";
import { initialsFrom } from "@/lib/format";

/** ---- Backend wire types (mirror of the OpenAPI schemas) ---- */

export interface ProductOut {
  id: number;
  serial_number: string;
  brand: string;
  model_no: string | null;
  category: string | null;
  description: string | null;
  quantity: number;
  price: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWrite {
  serial_number: string;
  brand: string;
  model_no?: string | null;
  category?: string | null;
  description?: string | null;
  quantity: number;
  price?: number | null;
}

export interface UserOut {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
}

/** ---- Derivations & mapping ---- */

/** Stock status is a frontend concept — derived from quantity. */
export function deriveStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 10) return "low_stock";
  return "in_stock";
}

export function toItem(p: ProductOut): Item {
  return {
    id: String(p.id),
    serialNumber: p.serial_number,
    brand: p.brand,
    modelNo: p.model_no ?? undefined,
    category: p.category ?? undefined,
    description: p.description ?? undefined,
    quantity: p.quantity,
    price: p.price ?? undefined,
    currency: CURRENCY,
    status: deriveStatus(p.quantity),
    imageUrl: p.image_url ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export function toProductWrite(input: ItemInput): ProductWrite {
  return {
    serial_number: input.serialNumber,
    brand: input.brand,
    model_no: input.modelNo ?? null,
    category: input.category ?? null,
    description: input.description ?? null,
    quantity: input.quantity,
    price: input.price ?? null,
  };
}

const roleFor = (isAdmin: boolean): Role => (isAdmin ? "admin" : "staff");

export function toUser(u: UserOut): User {
  return {
    id: String(u.id),
    email: u.email,
    name: u.email,
    role: roleFor(u.is_admin),
    initials: initialsFrom(u.email.split("@")[0]?.replace(/[._-]/g, " ") ?? u.email),
    createdAt: u.created_at,
  };
}

/** Best-effort JWT `exp` (seconds) → epoch ms, for token-expiry handling. */
export function jwtExpiry(token: string): number | undefined {
  try {
    const [, payload] = token.split(".");
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}
