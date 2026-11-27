import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cx } from "../lib/cx";
import { useInSheetWithFooter } from "./Sheet";

export const inputClass = (invalid?: boolean, className?: string) =>
  cx(
    "h-field w-full rounded-field border bg-surface px-4 text-[15px] text-ink placeholder:text-muted-2",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-expense" : "border-border",
    className,
  );

/**
 * Rótulo + controle + dica/erro. O controle filho recebe id, aria-invalid e
 * aria-describedby automaticamente.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactElement;
  className?: string;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: (children.props as { id?: string }).id ?? id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
        invalid: error ? true : undefined,
      })
    : children;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={(children.props as { id?: string }).id ?? id}
        className="text-sm font-semibold text-ink"
      >
        {label}
      </label>
      {control}
      {(error || hint) && (
        <p id={messageId} className={cx("text-[13px]", error ? "text-expense" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type Invalid = { invalid?: boolean };

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Invalid>(
  function TextInput({ invalid, className, ...props }, ref) {
    const inSheet = useInSheetWithFooter();
    return <input ref={ref} enterKeyHint={inSheet ? "done" : undefined} className={inputClass(invalid, className)} {...props} />;
  },
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Invalid>(
  function SelectInput({ invalid, className, ...props }, ref) {
    return <select ref={ref} className={inputClass(invalid, cx("appearance-auto", className))} {...props} />;
  },
);
