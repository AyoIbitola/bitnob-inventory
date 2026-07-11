import type { Item, ItemInput, Role, User } from "@/types";
import { initialsFrom } from "@/lib/format";

/** ---- Backend wire types (mirror of the OpenAPI schemas) ---- */

/** Mirrors the backend schema. NOTE: `quantity` was dropped — one row = one unit. */
export interface ProductOut {
  id: number;
  serial_number: string;
  brand: string;
  model_no: string | null;
  category: string | null;
  description: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWrite {
  serial_number: string;
  brand: string;
  model_no?: string | null;
  category?: string | null;
  description?: string | null;
  price?: number | null;
}

export interface UserOut {
  id: number;
  email: string;
  is_admin: boolean;
  created_at: string;
}

/** ---- Mapping ---- */

/** One backend row = one physical unit (serial_number is unique). */
export function toItem(p: ProductOut): Item {
  return {
    id: String(p.id),
    serialNumber: p.serial_number,
    brand: p.brand,
    modelNo: p.model_no ?? undefined,
    category: p.category ?? undefined,
    description: p.description ?? undefined,
    price: p.price ?? undefined,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

/** Partial-safe: only send keys the caller actually set (PATCH semantics). */
export function toProductWrite(input: Partial<ItemInput>): Partial<ProductWrite> {
  const out: Partial<ProductWrite> = {};
  if (input.serialNumber !== undefined) out.serial_number = input.serialNumber;
  if (input.brand !== undefined) out.brand = input.brand;
  if (input.modelNo !== undefined) out.model_no = input.modelNo || null;
  if (input.category !== undefined) out.category = input.category || null;
  if (input.description !== undefined) out.description = input.description || null;
  if (input.price !== undefined) out.price = input.price ?? null;
  return out;
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
