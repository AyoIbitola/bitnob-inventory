import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Material Symbols name rendered before the label. */
  icon?: string;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  // whitespace-nowrap: a button label must never wrap to two lines.
  "inline-flex items-center justify-center gap-sm whitespace-nowrap rounded-lg font-semibold transition-all " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-container " +
  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary: "bg-primary-container text-on-primary hover:brightness-110 shadow-sm",
  secondary:
    "bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-variant/20",
  ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/20",
  danger: "bg-error text-on-error hover:brightness-110 shadow-sm",
  "danger-outline": "border border-error text-error hover:bg-error/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-md text-body-sm",
  md: "h-11 px-lg text-body-md",
};

/**
 * The one button in the app. Variants cover every button in the mockups
 * (primary CTA, secondary, ghost icon buttons, destructive). No one-off button
 * styling elsewhere.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, loading, fullWidth, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="text-[20px]" /> : null}
      {children}
    </button>
  );
});
