import { useId } from "react";
import { cx } from "../lib/cx";
import { MoneyInput, type MoneyInputMode } from "./MoneyInput";

/** Valor em destaque (42px, Space Grotesk), sem borda, com rótulo e dica, como nas telas de valor do design. */
export function BigMoneyInput({
  label,
  value,
  onChange,
  error,
  hint,
  mode,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  mode?: MoneyInputMode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <MoneyInput
        id={id}
        appearance="big"
        mode={mode}
        value={value}
        onValueChange={onChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cx("text-[13px]", error ? "text-expense" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
