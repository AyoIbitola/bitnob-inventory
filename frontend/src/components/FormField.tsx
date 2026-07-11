import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

const controlBase =
  "w-full rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md " +
  "text-on-surface placeholder:text-on-surface-variant/60 focus-ring transition-shadow";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Shared label + error scaffold so every control is labelled and a11y-linked. */
function FieldWrapper({ label, htmlFor, error, required, children, className }: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-xs", className)}>
      <label
        htmlFor={htmlFor}
        className="text-label-caps uppercase tracking-wider text-on-surface-variant"
      >
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Optional leading icon (e.g. currency, search). */
  leadingIcon?: string;
  wrapperClassName?: string;
};

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, leadingIcon, required, className, wrapperClassName, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper
      label={label}
      htmlFor={fieldId}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        {leadingIcon && (
          <Icon
            name={leadingIcon}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
          />
        )}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(controlBase, "h-11 px-md", leadingIcon && "pl-10", className)}
          {...rest}
        />
      </div>
    </FieldWrapper>
  );
});

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  wrapperClassName?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, required, className, wrapperClassName, id, children, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <FieldWrapper
      label={label}
      htmlFor={fieldId}
      error={error}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(controlBase, "h-11 appearance-none px-md pr-10", className)}
          {...rest}
        >
          {children}
        </select>
        <Icon
          name="expand_more"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
      </div>
    </FieldWrapper>
  );
});

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  wrapperClassName?: string;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    { label, error, required, className, wrapperClassName, id, ...rest },
    ref,
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FieldWrapper
        label={label}
        htmlFor={fieldId}
        error={error}
        required={required}
        className={wrapperClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(controlBase, "resize-none px-md py-sm", className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
