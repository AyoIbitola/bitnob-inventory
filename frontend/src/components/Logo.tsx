import { cn } from "@/lib/cn";

interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number;
  className?: string;
}

/**
 * BitVault brand mark — a gradient "vault" glyph. Reused in the sidebar and
 * auth screens so branding is consistent and defined once.
 */
export function Logo({ size = 36, className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-[#6d28d9] text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: size * 0.58, fontVariationSettings: "'FILL' 1, 'wght' 500" }}
      >
        lock
      </span>
    </span>
  );
}
