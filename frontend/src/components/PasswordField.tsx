import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  wrapperClassName?: string;
}

/**
 * Password input with an in-field show/hide eye toggle and a Caps Lock warning.
 *
 * The toggle is a real button with an aria-label and aria-pressed so screen
 * reader and keyboard users get the same affordance as mouse users — an
 * icon-only control with no accessible name is a WCAG failure.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, wrapperClassName, id, className, ...rest }, ref) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    return (
      <div className={cn("flex flex-col gap-xs", wrapperClassName)}>
        <label
          htmlFor={fieldId}
          className="text-label-caps uppercase tracking-wider text-on-surface-variant"
        >
          {label}
          {rest.required && <span className="ml-0.5 text-error">*</span>}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
            onBlur={() => setCapsLock(false)}
            className={cn(
              "h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-md pr-12 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus-ring",
              className,
            )}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible ? "true" : "false"}
            title={visible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-variant/40 hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          >
            <Icon name={visible ? "visibility_off" : "visibility"} className="text-[20px]" />
          </button>
        </div>

        {capsLock && (
          <p className="flex items-center gap-xs text-body-sm text-status-warning-fg">
            <Icon name="keyboard_capslock" className="text-[16px]" />
            Caps Lock is on
          </p>
        )}

        {error && (
          <p className="text-body-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
