import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../lib/cx";

/** Ícone em quadrado arredondado de 44px (raio 14). */
export function IconTile({
  children,
  tone = "primary",
  className,
  style,
}: {
  children: ReactNode;
  tone?: "primary" | "expense" | "income" | "neutral";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        "inline-flex size-tap shrink-0 items-center justify-center rounded-tile",
        tone === "primary" && "bg-primary-tint text-primary",
        tone === "expense" && "bg-expense-tint text-expense",
        tone === "income" && "bg-income-tint text-income",
        tone === "neutral" && "bg-surface-2 text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Linha de lista: tile + título/subtítulo + valor à direita. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  to,
  onClick,
  className,
}: {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-[15px] font-semibold text-ink">{title}</span>
        {subtitle && <span className="truncate text-[13px] text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-right">{trailing}</span>}
    </>
  );
  const classes = cx(
    "flex min-h-16 w-full items-center gap-3",
    (to || onClick) &&
      "-mx-2 rounded-tile px-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
    className,
  );
  if (to)
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  return <div className={classes}>{content}</div>;
}
