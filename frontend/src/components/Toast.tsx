import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const tones: Record<ToastTone, { icon: string; className: string }> = {
  success: { icon: "check_circle", className: "border-status-success-fg/30 bg-status-success-bg text-status-success-fg" },
  error: { icon: "error", className: "border-error/30 bg-error-container text-on-error-container" },
  info: { icon: "info", className: "border-outline-variant bg-surface-container-lowest text-on-surface" },
};

/**
 * Lightweight toasts. Every mutation (create/edit/delete/rename/promote) confirms
 * itself here — a silent success is indistinguishable from a silent failure.
 *
 * role="status" + aria-live so screen readers announce the result too.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-sm sm:left-auto sm:right-4 sm:translate-x-0"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-sm rounded-lg border px-md py-sm text-body-sm shadow-overlay",
                "motion-safe:animate-[fadeIn_0.15s_ease-out]",
                tones[t.tone].className,
              )}
            >
              <Icon name={tones[t.tone].icon} className="mt-0.5 flex-shrink-0 text-[18px]" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => setToasts((c) => c.filter((x) => x.id !== t.id))}
                aria-label="Dismiss notification"
                className="flex-shrink-0 rounded opacity-60 hover:opacity-100"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
