import { cx } from "../lib/cx";

/** Interruptor 52×32 (role=switch). */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-border-strong",
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "absolute left-1 size-6 rounded-full bg-surface transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
