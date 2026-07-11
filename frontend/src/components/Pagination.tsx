import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Range summary + prev/next controls for server-paginated lists. Derives the
 * page count from `total`; disables ends appropriately.
 */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low/40 px-lg py-md">
      <p className="text-body-sm text-on-surface-variant">
        {total === 0 ? "No items" : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-sm">
        <PageButton
          label="Previous page"
          icon="chevron_left"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <span className="px-sm text-label-caps text-on-surface-variant">
          {page} / {totalPages}
        </span>
        <PageButton
          label="Next page"
          icon="chevron_right"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  );
}

function PageButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded border border-outline-variant p-1 text-on-surface-variant transition-colors",
        "hover:bg-surface-variant/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container",
        "disabled:cursor-not-allowed disabled:opacity-30",
      )}
    >
      <Icon name={icon} className="text-[20px]" />
    </button>
  );
}
