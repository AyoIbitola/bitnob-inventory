import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: string;
  /** Small caption under the value, e.g. a trend or hint. */
  hint?: ReactNode;
  /**
   * Semantic tone for the value. Rule: only colour a number when it actually
   * means something. A zero "Out of Stock" is GOOD news — painting it red cries
   * wolf and erodes the meaning of the alarm colour everywhere else.
   */
  tone?: "default" | "warning" | "error" | "primary";
  loading?: boolean;
  className?: string;
}

const valueTone = {
  default: "text-on-surface",
  warning: "text-status-warning-fg",
  error: "text-error",
  primary: "text-primary",
} as const;

/**
 * Compact metric card.
 *
 * Overflow safety is deliberate: a long value (e.g. a big currency amount on a
 * narrow phone) must never spill outside the card. `overflow-hidden` on the box
 * + `min-w-0` + `truncate` on the value makes that structurally impossible, and
 * the type scales down on small screens instead of being clipped.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = "default",
  loading,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-sm">
        <p className="min-w-0 truncate text-label-caps uppercase text-on-surface-variant">
          {label}
        </p>
        {icon && <Icon name={icon} className="flex-shrink-0 text-[20px] text-primary" />}
      </div>

      {loading ? (
        <div className="mt-sm h-8 w-20 animate-pulse rounded bg-surface-variant" />
      ) : (
        <p
          // title => the full value stays reachable even if visually truncated.
          title={typeof value === "string" || typeof value === "number" ? String(value) : undefined}
          className={cn(
            "mt-sm min-w-0 truncate text-headline-sm font-bold tabular-nums md:text-display-md",
            valueTone[tone],
          )}
        >
          {value}
        </p>
      )}

      {hint && (
        <div className="mt-sm truncate text-body-sm text-on-surface-variant">{hint}</div>
      )}
    </div>
  );
}
