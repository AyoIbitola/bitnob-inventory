import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { StatusBadge } from "@/components/Badge";
import { ApiError } from "@/api";
import { formatPrice, itemDisplayName } from "@/lib/format";
import type { Item } from "@/types";
import { useAiSearch } from "./hooks";

interface AiSearchDialogProps {
  open: boolean;
  onClose: () => void;
  /** Open an item's detail from a result. */
  onSelectItem: (item: Item) => void;
}

/**
 * Natural-language search over inventory (backend POST /search → AI answer +
 * matched products). Distinct from the quick text filter in the toolbar. Fails
 * gracefully — the endpoint is known to error server-side at times.
 */
export function AiSearchDialog({ open, onClose, onSelectItem }: AiSearchDialogProps) {
  const [query, setQuery] = useState("");
  const search = useAiSearch();
  const { reset } = search;

  useEffect(() => {
    if (open) {
      setQuery("");
      reset();
    }
  }, [open, reset]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) search.mutate(q);
  }

  const result = search.data;

  return (
    <Modal open={open} onClose={onClose} title="Ask AI" widthClass="max-w-[520px]">
      <form onSubmit={handleSubmit} className="flex gap-sm">
        <div className="relative flex-1">
          <Icon
            name="auto_awesome"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-primary"
          />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. which mice are low on stock?"
            aria-label="Ask a question about inventory"
            className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-md text-body-md focus-ring"
          />
        </div>
        <Button type="submit" loading={search.isPending} disabled={!query.trim()}>
          Ask
        </Button>
      </form>

      <div className="mt-md">
        {search.isError && (
          <div className="flex items-start gap-sm rounded-lg border border-error-container bg-error-container/40 px-md py-sm text-body-sm text-on-error-container">
            <Icon name="error" className="text-[20px]" />
            <span>
              {search.error instanceof ApiError && search.error.status !== 500
                ? search.error.message
                : "AI search is temporarily unavailable. Try the filters instead."}
            </span>
          </div>
        )}

        {result && (
          <div className="space-y-md">
            <p className="rounded-lg bg-surface-container-low px-md py-sm text-body-md text-on-surface">
              {result.answer}
            </p>

            {result.items.length > 0 && (
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {result.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="flex w-full items-center justify-between gap-md px-md py-sm text-left transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:bg-surface-container-low"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-on-surface">
                          {itemDisplayName(item)}
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          {item.serialNumber} · {formatPrice(item.price, item.currency)}
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
