/**
 * Display formatters. Centralized so currency/date rendering is consistent and
 * locale changes happen in one place.
 */

import { CURRENCY } from "@/config";
import type { Item } from "@/types";

export function formatCurrency(amount: number, currency = CURRENCY): string {
  // narrowSymbol => "₦173,000" instead of the much wider literal "NGN 173,000.00".
  // Whole naira: kobo decimals add width and no information for hardware prices.
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Some engines don't support narrowSymbol — fall back rather than throw.
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

/** Human-facing product name. Backend has no `name`; compose brand + model. */
export function itemDisplayName(item: Pick<Item, "brand" | "modelNo">): string {
  return [item.brand, item.modelNo].filter(Boolean).join(" ") || "Untitled item";
}

/** Currency, tolerant of the nullable backend `price`. */
export function formatPrice(price: number | undefined, currency = CURRENCY): string {
  if (price === undefined || price === null) return "—";
  return formatCurrency(price, currency);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

/** e.g. "Oct 24, 2023 · 09:45 AM" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const d = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const t = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${d} · ${t}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Derive avatar initials from a name when the backend doesn't supply them. */
export function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
