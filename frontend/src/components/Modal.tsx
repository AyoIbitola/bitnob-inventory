import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Footer actions (usually Cancel + confirm buttons). */
  footer?: ReactNode;
  /** Use role="alertdialog" for destructive confirmations. */
  role?: "dialog" | "alertdialog";
  /** Max-width utility class, e.g. "max-w-[520px]". */
  widthClass?: string;
}

/**
 * Centered modal dialog. Portaled to <body>, focus-trapped, closes on Escape or
 * backdrop click, and labelled via aria-labelledby/‑describedby. Reused for the
 * delete confirmation and any future dialogs.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  role = "dialog",
  widthClass = "max-w-[400px]",
}: ModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const descId = useId();

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 p-md backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-overlay",
          widthClass,
        )}
      >
        <div className="space-y-md p-lg">
          <h2 id={titleId} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <div id={descId} className="text-body-md text-on-surface-variant">
            {children}
          </div>
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-sm bg-surface-container-low px-lg py-md">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
