import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";
import { Icon } from "./Icon";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide below this breakpoint on the desktop table. */
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
  emptyState?: ReactNode;
  caption?: string;
  /**
   * Mobile renderer. When provided, screens below `md` get a stacked card list
   * instead of a horizontally-squashed table. Strongly recommended — a data
   * table never reads well on a phone.
   */
  renderCard?: (row: T) => ReactNode;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;
const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

/**
 * Config-driven data table. Owns its loading / empty / error presentation so
 * every list screen renders those states identically, and degrades to cards on
 * mobile. Semantic <table> markup with a screen-reader caption.
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
  renderCard,
}: TableProps<T>) {
  const state = isLoading ? (
    <span className="inline-flex items-center gap-sm text-on-surface-variant">
      <Spinner /> Loading…
    </span>
  ) : error ? (
    <div className="flex flex-col items-center gap-sm text-on-surface-variant">
      <Icon name="error" className="text-error" />
      <span>{error}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-body-sm font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  ) : rows.length === 0 ? (
    (emptyState ?? <span className="text-on-surface-variant">No items found.</span>)
  ) : null;

  return (
    <div
      className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
      aria-busy={isLoading ? "true" : undefined}
    >
      {/* Mobile: cards */}
      {renderCard && (
        <div className="md:hidden">
          {state ? (
            <div className="px-lg py-xl text-center">{state}</div>
          ) : (
            <ul className="divide-y divide-outline-variant">
              {rows.map((row) => (
                <li key={rowKey(row)}>
                  {onRowClick ? (
                    <button
                      type="button"
                      onClick={() => onRowClick(row)}
                      className="w-full px-md py-md text-left transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:bg-surface-container-low"
                    >
                      {renderCard(row)}
                    </button>
                  ) : (
                    <div className="px-md py-md">{renderCard(row)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Desktop (or all sizes when no card renderer): table */}
      <div className={cn("overflow-x-auto", renderCard && "hidden md:block")}>
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-outline-variant bg-surface-container-low">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-lg py-md text-label-caps uppercase text-on-surface-variant",
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
            {state ? (
              <tr>
                <td colSpan={columns.length} className="px-lg py-xl text-center">
                  {state}
                </td>
              </tr>
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
    </div>
  );
}
