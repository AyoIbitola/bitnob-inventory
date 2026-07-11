import { cn } from "@/lib/cn";

interface IconProps {
  /** Material Symbols Outlined ligature name, e.g. "search", "delete". */
  name: string;
  className?: string;
  /** Decorative icons are hidden from screen readers; provide a label to expose. */
  label?: string;
}

/**
 * Single icon abstraction over Material Symbols Outlined (already loaded in
 * index.html). Every icon in the app goes through here so we can swap icon
 * sets later without touching call sites. Size via text-* utility classes.
 */
export function Icon({ name, className, label }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined leading-none", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}
