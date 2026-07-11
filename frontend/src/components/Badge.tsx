import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { StockStatus } from "@/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-variant/60 text-on-surface-variant",
  success: "bg-status-success-bg text-status-success-fg",
  warning: "bg-status-warning-bg text-status-warning-fg",
  danger: "bg-status-danger-bg text-status-danger-fg",
  info: "bg-secondary-container text-on-secondary-container",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  /** Show a leading status dot. */
  dot?: boolean;
  className?: string;
}

/** Generic pill badge. Used for categories (neutral) and any tagging. */
export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs rounded px-sm py-0.5 text-label-caps uppercase tracking-wider",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Maps stock status → tone + label in one place, so every screen agrees. */
const statusMeta: Record<StockStatus, { tone: Tone; label: string }> = {
  in_stock: { tone: "success", label: "In Stock" },
  low_stock: { tone: "warning", label: "Low Stock" },
  out_of_stock: { tone: "danger", label: "Out of Stock" },
};

export function StatusBadge({ status, dot }: { status: StockStatus; dot?: boolean }) {
  const meta = statusMeta[status];
  return (
    <Badge tone={meta.tone} dot={dot}>
      {meta.label}
    </Badge>
  );
}
