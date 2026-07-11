/**
 * Reference-counted body scroll lock.
 *
 * Overlays (SidePanel, Modal) must not each save/restore `body.overflow`
 * themselves. Overlays overlap — opening Edit or Delete FROM the detail panel
 * means two are briefly mounted — and a naive save/restore makes the second
 * overlay record "hidden" as the original value and then restore *that* when it
 * closes. The body is then permanently scroll-locked: the page looks frozen and
 * only a refresh clears it.
 *
 * Counting locks instead means the body is only unlocked once the LAST overlay
 * has closed, and it's always restored to its true original value.
 */
let lockCount = 0;
let originalOverflow: string | null = null;

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow ?? "";
    originalOverflow = null;
  }
}
