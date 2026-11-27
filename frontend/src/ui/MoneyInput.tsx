import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { cx } from "../lib/cx";
import { formatMoney, toCents } from "../lib/money";
import { inputClass } from "./Field";

/**
 * Campo de dinheiro do app, sem dependência externa. Dois modos de digitação:
 *
 * - `decimal` (padrão): digita-se como se escreve. "1650" → R$ 1.650,
 *   "19,9" → R$ 19,9. A vírgula separa os centavos (até 2 casas), o ponto
 *   digitado é ignorado e o milhar é agrupado sozinho.
 * - `cents`: como em apps de banco. Os dígitos entram pela direita
 *   (2-0-0-0 → R$ 20,00) e apagar tira o último dígito.
 *
 * Nos dois modos o valor é um número em reais (`null` = vazio), colar
 * "R$ 1.234,56" ou "89.9" é lido como reais e valores negativos não existem.
 */

export type MoneyInputMode = "decimal" | "cents";

const PREFIX = "R$ ";
/** Até R$ 999.999.999,99. */
const MAX_INTEGER_DIGITS = 9;

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Dígitos de um texto qualquer → centavos ("R$ 19,905" → 19905). Modo centavos. */
export function digitsToCents(text: string): number {
  const digits = text.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_INTEGER_DIGITS + 2);
  return digits ? Number(digits) : 0;
}

/**
 * Normaliza o que foi digitado no modo decimal: só dígitos e a primeira
 * vírgula, sem zeros à esquerda, no máximo 2 casas. Devolve a parte "crua"
 * ("1650", "19,", "0,5") ou "" se não sobrou nada.
 */
export function normalizeDecimal(text: string): string {
  const clean = text.replace(/[^\d,]/g, "");
  const comma = clean.indexOf(",");
  const rawInteger = comma === -1 ? clean : clean.slice(0, comma);
  const fraction = comma === -1 ? undefined : clean.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  let integer = rawInteger.replace(/^0+(?=\d)/, "").slice(0, MAX_INTEGER_DIGITS);
  if (fraction !== undefined && !integer) integer = "0";
  return fraction === undefined ? integer : `${integer},${fraction}`;
}

/** "1650" → "R$ 1.650"; "19,9" → "R$ 19,9"; "" → "". */
export function formatDecimal(raw: string): string {
  if (!raw) return "";
  const [integer, fraction] = raw.split(",");
  return PREFIX + groupThousands(integer) + (fraction === undefined ? "" : `,${fraction}`);
}

/** Parte crua → reais ("19,9" → 19.9; "" → null). */
export function parseDecimal(raw: string): number | null {
  if (!raw) return null;
  const [integer, fraction = ""] = raw.split(",");
  return Number(integer || "0") + Number(fraction.padEnd(2, "0")) / 100;
}

/** Reais → parte crua, sem zeros sobrando (19.9 → "19,9"; 1650 → "1650"). */
function rawFromValue(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return "";
  const cents = toCents(value);
  const integer = String(Math.floor(cents / 100));
  const fraction = String(cents % 100).padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${integer},${fraction}` : integer;
}

/** Texto colado → reais, se parecer um valor ("R$ 1.234,5", "89.90", "1234"). */
export function parsePastedMoney(text: string): number | null {
  const compact = text.trim().replace(/R\$|\s/g, "");
  const match = compact.match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}))?$/) ?? compact.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[1].replace(/\D/g, "")) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents ? cents / 100 : null;
}

/** Quantos caracteres "que contam" (dígitos e vírgula) há antes da posição. */
const significantBefore = (text: string, position: number) => text.slice(0, position).replace(/[^\d,]/g, "").length;

/** Posição no texto formatado logo depois do n-ésimo caractere que conta. */
function positionAfter(text: string, count: number) {
  if (count <= 0) return Math.min(PREFIX.length, text.length);
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/[\d,]/.test(text[index]) && ++seen === count) return index + 1;
  }
  return text.length;
}

const appearances = {
  field: (invalid?: boolean, className?: string) => inputClass(invalid, cx("font-num text-base font-semibold", className)),
  big: (_invalid?: boolean, className?: string) =>
    cx(
      "min-h-[64px] w-full rounded-field border-0 bg-transparent p-0 text-center font-num text-[42px] font-semibold leading-tight tracking-[-0.02em] text-ink placeholder:text-muted-2",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
      className,
    ),
};

export type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  /** Valor em reais; `null` = vazio. */
  value: number | null;
  onValueChange: (value: number | null) => void;
  mode?: MoneyInputMode;
  /** `field`: campo comum de formulário. `big`: valor em destaque (42px, sem borda). */
  appearance?: keyof typeof appearances;
  invalid?: boolean;
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onValueChange, mode = "decimal", appearance = "field", invalid, className, placeholder = "R$ 0,00", onPaste, onFocus, ...props },
  forwarded,
) {
  const local = useRef<HTMLInputElement | null>(null);
  // Modo decimal guarda o que foi digitado ("19," precisa sobreviver até a próxima tecla).
  const [raw, setRaw] = useState(() => rawFromValue(value));
  // Onde pôr o cursor depois de reformatar: n caracteres que contam, ou o fim.
  const caret = useRef<number | "end" | null>(null);

  // Valor mudou por fora (abrir para editar, "Limpar", sugestão): reescreve o texto.
  useEffect(() => {
    if (mode !== "decimal") return;
    setRaw((current) => {
      const parsed = parseDecimal(current);
      const same = parsed === null || value === null ? parsed === value : toCents(parsed) === toCents(value);
      return same ? current : rawFromValue(value);
    });
  }, [value, mode]);

  const text = mode === "cents" ? (value ? formatMoney(value) : "") : formatDecimal(raw);

  // Sem dependências: também roda quando a tecla foi rejeitada e o texto não mudou.
  useLayoutEffect(() => {
    const input = local.current;
    const target = caret.current;
    caret.current = null;
    if (!input || target === null || document.activeElement !== input) return;
    const position = target === "end" ? input.value.length : positionAfter(input.value, target);
    input.setSelectionRange(position, position);
  });

  // Modo centavos: o navegador não edita o texto. Cada tecla é interceptada
  // antes (beforeinput) e vira "acrescenta dígito" ou "tira o último", então
  // a posição do cursor não importa e não há como editar o meio do número.
  // Se o teclado não deixar cancelar (alguns IMEs), o onChange abaixo cobre.
  const valueRef = useRef(value);
  valueRef.current = value;
  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  useEffect(() => {
    const input = local.current;
    if (mode !== "cents" || !input) return;
    const handle = (event: InputEvent) => {
      const cents = valueRef.current ? toCents(valueRef.current) : 0;
      let next: number | undefined;
      if (event.inputType === "insertText" || event.inputType === "insertReplacementText") {
        const digits = (event.data ?? "").replace(/\D/g, "");
        next = digitsToCents(String(cents) + digits);
      } else if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        next = Math.floor(cents / 10);
      } else if (event.inputType.startsWith("delete")) {
        next = 0; // Ctrl/Alt+Backspace, recortar: limpa.
      } else if (event.inputType === "insertFromPaste") {
        return; // tratado no onPaste
      }
      if (!event.cancelable) return;
      event.preventDefault();
      if (next === undefined || next === cents) return;
      caret.current = "end";
      onValueChangeRef.current(next ? next / 100 : null);
    };
    input.addEventListener("beforeinput", handle);
    return () => input.removeEventListener("beforeinput", handle);
  }, [mode]);

  const commit = (next: number | null) => {
    if (mode === "decimal") setRaw(rawFromValue(next));
    caret.current = "end";
    onValueChange(next);
  };

  return (
    <input
      {...props}
      ref={(node) => {
        local.current = node;
        if (typeof forwarded === "function") forwarded(node);
        else if (forwarded) forwarded.current = node;
      }}
      type="text"
      inputMode={mode === "cents" ? "numeric" : "decimal"}
      autoComplete="off"
      placeholder={placeholder}
      aria-invalid={props["aria-invalid"] ?? (invalid ? true : undefined)}
      className={appearances[appearance](invalid, className)}
      value={text}
      onFocus={(event) => {
        if (mode === "cents") {
          const input = event.currentTarget;
          requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
        }
        onFocus?.(event);
      }}
      onSelect={(event) => {
        // Modo centavos: o cursor mora no fim e não há seleção (nem "selecionar tudo").
        if (mode !== "cents") return;
        const input = event.currentTarget;
        const end = input.value.length;
        if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
      }}
      onChange={(event) => {
        if (mode === "cents") {
          const cents = digitsToCents(event.target.value);
          caret.current = "end";
          onValueChange(cents ? cents / 100 : null);
          return;
        }
        const typed = event.target.value;
        const next = normalizeDecimal(typed);
        caret.current = significantBefore(typed, event.target.selectionStart ?? typed.length);
        setRaw(next);
        onValueChange(parseDecimal(next));
      }}
      onPaste={(event) => {
        onPaste?.(event);
        if (event.defaultPrevented) return;
        const pasted = parsePastedMoney(event.clipboardData.getData("text"));
        if (pasted === null) return;
        event.preventDefault();
        commit(pasted);
      }}
    />
  );
});
