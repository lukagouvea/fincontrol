import { useId } from "react";
import CurrencyInput from "react-currency-input-field";
import { cx } from "../lib/cx";

/** Valor em destaque (42px, Space Grotesk), sem borda, como nas telas de valor do design. */
export function BigMoneyInput({
  label,
  text,
  onChange,
  error,
  hint,
}: {
  label: string;
  text?: string;
  onChange: (text: string | undefined, value: number | null) => void;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col items-center gap-1">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <CurrencyInput
        id={id}
        intlConfig={{ locale: "pt-BR", currency: "BRL" }}
        decimalsLimit={2}
        inputMode="decimal"
        placeholder="R$ 0,00"
        value={text}
        onValueChange={(value, _name, values) => onChange(value, values?.float ?? null)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(
          "min-h-[64px] w-full rounded-field border-0 bg-transparent p-0 text-center font-num text-[42px] font-semibold leading-tight tracking-[-0.02em] text-ink placeholder:text-muted-2",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
        )}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cx("text-[13px]", error ? "text-expense" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
