import { formatMoney, formatSignedMoney, type MoneyKind } from "../lib/money";
import { cx } from "../lib/cx";

const sizes = {
  sm: "text-[15px]",
  md: "text-base",
  lg: "text-[26px] lg:text-[30px] leading-none tracking-[-0.02em]",
  hero: "text-[42px] lg:text-[44px] leading-none tracking-[-0.02em]",
} as const;

/**
 * Valor monetário em Space Grotesk. Despesas em --expense com "−", receitas em
 * --income com "+". `signed=false` mostra só o valor (ex.: totais de cartão).
 */
export function Money({
  value,
  kind = "neutral",
  size = "md",
  signed = kind !== "neutral",
  colored = true,
  cents = true,
  className,
}: {
  value: number;
  kind?: MoneyKind;
  size?: keyof typeof sizes;
  signed?: boolean;
  colored?: boolean;
  cents?: boolean;
  className?: string;
}) {
  const text = signed ? formatSignedMoney(value, kind) : formatMoney(value, { cents });
  return (
    <span
      className={cx(
        "whitespace-nowrap font-num font-semibold tabular-nums",
        sizes[size],
        colored && kind === "expense" && "text-expense",
        colored && kind === "income" && "text-income",
        className,
      )}
    >
      {text}
    </span>
  );
}
