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
}

const valueTone = {
  default: "text-on-surface",
  warning: "text-status-warning-fg",
  error: "text-error",
  primary: "text-primary",
} as const;

/** Compact metric card for dashboard summaries. */
export function StatCard({ label, value, icon, hint, tone = "default", loading }: StatCardProps) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-label-caps uppercase text-on-surface-variant">{label}</p>
        {icon && <Icon name={icon} className="text-primary" />}
      </div>
      {loading ? (
        <div className="mt-sm h-8 w-20 animate-pulse rounded bg-surface-variant" />
      ) : (
        <p className={cn("mt-sm text-display-md font-bold", valueTone[tone])}>{value}</p>
      )}
      {hint && <div className="mt-sm text-body-sm text-on-surface-variant">{hint}</div>}
    </div>
  );
}
