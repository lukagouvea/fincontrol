import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

/** Chip de filtro (44px, pílula). Usa aria-pressed para o estado. */
export function Chip({
  selected = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "inline-flex min-h-tap shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        selected
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-surface text-ink hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export type BadgeTone = "neutral" | "primary" | "income" | "expense" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary-tint text-primary",
  income: "bg-income-tint text-income",
  expense: "bg-expense-tint text-expense",
  info: "bg-[var(--card-vento-tint)] text-[var(--card-vento-ink)]",
};

/** Etiqueta pequena (forma de pagamento, status). */
export function Badge({
  tone = "neutral",
  children,
  className,
  style,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cx(
        "inline-flex min-h-[26px] items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
