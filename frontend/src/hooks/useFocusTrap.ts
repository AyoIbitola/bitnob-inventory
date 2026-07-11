import { useEffect, useRef } from "react";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus within an overlay (modal/panel), restores focus to the trigger on
 * unmount, closes on Escape, and locks body scroll. Shared by Modal and
 * SidePanel so keyboard accessibility isn't reimplemented per component.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the overlay.
    const focusables = container?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables?.[0] ?? container)?.focus();

    // Lock scroll on the page beneath. Reference-counted: overlays overlap
    // (Edit/Delete open FROM the detail panel), and a per-overlay
    // save/restore left the body permanently stuck at overflow:hidden — the
    // page then looked frozen until a refresh.
    lockBodyScroll();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [active, onClose]);

  return containerRef;
}
