import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Icon } from "./Icon";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky footer actions. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Right-hand slide-in panel. Portaled, focus-trapped, Escape/backdrop close.
 * Used by both the Item Detail (read) and Add/Edit (form) screens — same shell,
 * different body — so the panel chrome isn't duplicated.
 */
export function SidePanel({ open, onClose, title, children, footer, className }: SidePanelProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const titleId = useId();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-background/40 backdrop-blur-[2px] motion-safe:animate-[fadeIn_0.2s_ease-out]"
        onMouseDown={onClose}
        aria-hidden
      />
      {/* Panel */}
      <aside
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          // h-dvh (not h-full/100vh) so mobile browser chrome can't push the
          // sticky footer buttons below the fold.
          "absolute right-0 top-0 flex h-dvh max-h-dvh w-full max-w-[440px] flex-col border-l border-outline-variant bg-surface-container-lowest shadow-overlay",
          "motion-safe:animate-[slideIn_0.3s_cubic-bezier(0.16,1,0.3,1)]",
          className,
        )}
      >
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-outline-variant px-lg">
          <h2 id={titleId} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-lg">{children}</div>

        {footer && (
          <footer className="flex flex-shrink-0 items-center gap-md border-t border-outline-variant bg-surface p-lg">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
