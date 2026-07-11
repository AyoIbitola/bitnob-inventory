import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";
import { Icon } from "./Icon";

export interface Column<T> {
  /** Stable key for React and for aligning header ↔ cell. */
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Optional width utility class, e.g. "w-24". */
  className?: string;
  /** Hide below this responsive breakpoint prefix, e.g. "md" hides on mobile. */
  hideBelow?: "sm" | "md" | "lg";
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Shown when there are no rows and not loading. */
  emptyState?: ReactNode;
  caption?: string;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;
const hideClass = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;

/**
 * Generic, config-driven data table. Owns its own loading / empty / error
 * presentation so every list screen renders these states identically (req #1).
 * Semantic <table> markup with a caption for screen readers (req #6).
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  error,
  onRetry,
  emptyState,
  caption,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
      <table className="w-full border-collapse text-left">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-outline-variant bg-surface-container-low">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "px-lg py-md text-label-caps uppercase text-on-surface-variant",
                  alignClass[col.align ?? "left"],
                  col.hideBelow && hideClass[col.hideBelow],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {isLoading ? (
            <StateRow colSpan={columns.length}>
              <span className="inline-flex items-center gap-sm text-on-surface-variant">
                <Spinner /> Loading…
              </span>
            </StateRow>
          ) : error ? (
            <StateRow colSpan={columns.length}>
              <div className="flex flex-col items-center gap-sm text-on-surface-variant">
                <Icon name="error" className="text-error" />
                <span>{error}</span>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="text-body-sm font-semibold text-primary hover:underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </StateRow>
          ) : rows.length === 0 ? (
            <StateRow colSpan={columns.length}>
              {emptyState ?? <span className="text-on-surface-variant">No items found.</span>}
            </StateRow>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "group transition-colors",
                  onRowClick &&
                    "cursor-pointer hover:bg-surface-container-low focus:outline-none focus-visible:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-container",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-lg py-md text-body-md text-on-surface",
                      alignClass[col.align ?? "left"],
                      col.hideBelow && hideClass[col.hideBelow],
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StateRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-lg py-xl text-center">
        {children}
      </td>
    </tr>
  );
}
