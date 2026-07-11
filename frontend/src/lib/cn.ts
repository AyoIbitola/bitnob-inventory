/**
 * Tiny classname joiner. Filters falsy values so conditional classes read
 * cleanly: cn("base", isActive && "active"). Kept dependency-free — no need
 * for clsx/tailwind-merge at this scale.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
