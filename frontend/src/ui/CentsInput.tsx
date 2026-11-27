import { forwardRef, useLayoutEffect, useRef, type InputHTMLAttributes } from "react";
import { formatMoney } from "../lib/money";

/** Até R$ 999.999.999,99. */
const MAX_DIGITS = 11;

/** Dígitos de um texto qualquer → centavos ("R$ 19,905" → 19905). */
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS);
  return digits ? Number(digits) : 0;
}

/**
 * Valor em modo centavos, como em apps de banco: os dígitos entram pela
 * direita (2-0-0-0 → R$ 20,00) e apagar tira o último dígito. Colar
 * "R$ 1.234,56" ou "1234,56" também funciona. O cursor fica sempre no fim.
 */
export const CentsInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
    /** Valor em reais (null = vazio). */
    value: number | null;
    onValueChange: (value: number | null) => void;
  }
>(function CentsInput({ value, onValueChange, placeholder = "R$ 0,00", ...props }, forwarded) {
  const local = useRef<HTMLInputElement | null>(null);
  const text = value ? formatMoney(value) : "";

  // Depois de cada mudança, devolve o cursor ao fim (os dígitos entram pela direita).
  useLayoutEffect(() => {
    const input = local.current;
    if (input && document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length);
  }, [text]);

  return (
    <input
      {...props}
      ref={(node) => {
        local.current = node;
        if (typeof forwarded === "function") forwarded(node);
        else if (forwarded) forwarded.current = node;
      }}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onFocus={(event) => {
        const input = event.currentTarget;
        requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
        props.onFocus?.(event);
      }}
      onChange={(event) => {
        const cents = digitsToCents(event.target.value);
        onValueChange(cents ? cents / 100 : null);
      }}
      onPaste={(event) => {
        // Colar um valor com vírgula/ponto: interpreta como reais, não como dígitos soltos.
        const pasted = event.clipboardData.getData("text").trim();
        const match = pasted.replace(/R\$|\s/g, "").match(/^(\d{1,3}(?:[.\s]?\d{3})*|\d+)([.,]\d{1,2})?$/);
        if (!match) return;
        event.preventDefault();
        const whole = match[1].replace(/\D/g, "");
        const fraction = (match[2] ?? "").replace(/\D/g, "").padEnd(2, "0");
        const cents = Number(whole) * 100 + Number(fraction || 0);
        onValueChange(cents ? cents / 100 : null);
      }}
    />
  );
});
