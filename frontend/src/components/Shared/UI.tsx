import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleAlert,
  Inbox,
  Loader2,
} from "lucide-react";

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      className={"button button-" + variant + " " + className}
      {...props}
    >
      {children}
    </button>
  );
}
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
export function Panel({
  title,
  children,
  className = "",
  actions,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {actions}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function ErrorState({
  message = "Não foi possível carregar os dados.",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="notice notice-error" role="alert">
      <CircleAlert size={20} aria-hidden="true" />
      <div>
        <p>{message}</p>
        {retry && (
          <Button variant="secondary" onClick={retry}>
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={24} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <Loader2 className="animate-spin" size={20} aria-hidden="true" />
      <span>Carregando seus dados…</span>
    </div>
  );
}
export function CategoryLabel({
  name = "Sem categoria",
  color,
}: {
  name?: string;
  color?: string;
}) {
  return (
    <span className="category-label">
      {color && <span style={{ backgroundColor: color }} aria-hidden="true" />}
      {name}
    </span>
  );
}
export function Money({
  value,
  type,
  className = "",
}: {
  value: number;
  type?: "income" | "expense";
  className?: string;
}) {
  return (
    <span
      className={
        "money " +
        (value < 0 || type === "expense" ? "money-negative " : "") +
        className
      }
    >
      {type === "income" ? (
        <ArrowDownLeft size={14} aria-hidden="true" />
      ) : type === "expense" ? (
        <ArrowUpRight size={14} aria-hidden="true" />
      ) : null}
      {formatMoney(value)}
    </span>
  );
}
export const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export function MonthPicker({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const now = new Date().getFullYear();
  const years = Array.from(
    new Set([year, ...Array.from({ length: 9 }, (_, i) => now + 2 - i)]),
  ).sort((a, b) => b - a);
  return (
    <div className="month-picker">
      <label className="sr-only" htmlFor="period-month">
        Mês
      </label>
      <select
        id="period-month"
        value={month}
        onChange={(e) => onChange(Number(e.target.value), year)}
      >
        {monthNames.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="period-year">
        Ano
      </label>
      <select
        id="period-year"
        value={year}
        onChange={(e) => onChange(month, Number(e.target.value))}
      >
        {years.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
