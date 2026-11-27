import type { BurnPoint, WeekStatus } from "../budget";
import { formatShortDate, parseDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Chip";
import { Burndown } from "../../ui/charts/Burndown";
import { weekMessage } from "./WeekCard";

function pace(points: BurnPoint[]) {
  const last = points.reduce<BurnPoint | null>((found, p) => (p.real !== null ? p : found), null);
  if (!last) return { ahead: false, diff: 0, end: null as number | null };
  return { ahead: last.real! < last.ideal, diff: last.ideal - last.real!, end: points.at(-1)?.projection ?? last.real };
}

/** Ritmo do mês: orçamento variável restante por dia. */
export function MonthPaceCard({ points, variable, monthEnd }: { points: BurnPoint[]; variable: number; monthEnd: string }) {
  const { ahead, diff, end } = pace(points);
  const remaining = points.reduce<number | null>((found, p) => (p.real !== null ? p.real : found), null) ?? variable;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Ritmo do mês</h2>
          <p className="text-[13px] text-muted">
            Restam {formatMoney(remaining)} até dia {parseDateKey(monthEnd).getDate()}
          </p>
        </div>
        <Badge tone={ahead ? "expense" : "primary"}>{ahead ? "Acima do ideal" : "No ritmo"}</Badge>
      </div>
      <p className="text-[13px] text-muted">Orçamento variável que resta, em R$, por dia do mês</p>
      <Burndown points={points} budget={variable} label="Ritmo do mês" />
      <p className={cx("rounded-2xl px-3 py-2 text-[13px]", ahead ? "bg-surface-2" : "bg-primary-tint")}>
        {ahead ? `Até hoje você gastou ${formatMoney(diff)} a mais que o ideal.` : `Até hoje você está ${formatMoney(-diff)} abaixo do ideal.`}{" "}
        {end !== null && (end >= 0 ? `No ritmo atual, o mês fecha dentro do limite (sobram ${formatMoney(end)}).` : `No ritmo atual, o mês passa do limite em ${formatMoney(-end)}.`)}
      </p>
    </Card>
  );
}

/** Ritmo da semana: limite da semana restante por dia. */
export function WeekPaceCard({ week, points }: { week: WeekStatus; points: BurnPoint[] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Ritmo da semana</h2>
          <p className="text-[13px] text-muted">
            {formatShortDate(week.week.start)} a {formatShortDate(week.week.end)} · limite {formatMoney(week.limit)}
          </p>
        </div>
        <Badge tone={week.state === "ok" ? "primary" : "expense"}>{week.state === "ok" ? "No ritmo" : week.state === "atencao" ? "Atenção" : "Passou"}</Badge>
      </div>
      <p className="text-[13px] text-muted">Limite da semana que resta, em R$, por dia</p>
      <Burndown points={points.map((p) => ({ ...p, label: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][parseDateKey(p.x).getDay()] }))} budget={week.limit} label="Ritmo da semana" />
      <p className={cx("rounded-2xl px-3 py-2 text-[13px]", week.state === "ok" ? "bg-primary-tint" : "bg-expense-tint text-expense")}>{weekMessage(week)}</p>
    </Card>
  );
}

/** Semana a semana: gasto variável × limite de cada semana do mês. */
export function WeeksCard({ weeks, today }: { weeks: WeekStatus[]; today: string }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.spent, w.limit]));
  const over = weeks.filter((w) => w.week.start <= today && w.spent > w.limit);
  return (
    <Card>
      <div>
        <h2 className="text-[15px] font-semibold">Semana a semana</h2>
        <p className="text-[13px] text-muted">Gasto variável contra o limite de cada semana</p>
      </div>
      <figure aria-label="Gasto por semana" className="flex items-end gap-3">
        {weeks.map((w) => {
          const current = w.week.start <= today && today <= w.week.end;
          const label = `${parseDateKey(w.week.start).getDate()} a ${parseDateKey(w.week.end).getDate()}`;
          return (
            <div key={w.week.start} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative flex h-28 w-full items-end justify-center" role="img" aria-label={`${label}: gasto ${formatMoney(w.spent)}, limite ${formatMoney(w.limit)}`}>
                <span aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-ink-2" style={{ bottom: `${(w.limit / max) * 100}%` }} />
                <span
                  aria-hidden="true"
                  className={cx("w-3/5 max-w-[56px] rounded-t-md", w.spent > w.limit ? "bg-expense" : "bg-primary")}
                  style={{ height: `${w.spent ? Math.max(4, (w.spent / max) * 100) : 0}%` }}
                />
              </div>
              <span aria-hidden="true" className={cx("text-xs", current ? "font-semibold text-ink" : "text-muted")}>
                {label}
              </span>
            </div>
          );
        })}
      </figure>
      {over.length > 0 && (
        <ul className="border-t border-border">
          {over.map((w) => (
            <li key={w.week.start} className="flex min-h-12 items-center justify-between gap-3 border-b border-border last:border-b-0">
              <span className="text-[15px] font-semibold">
                {parseDateKey(w.week.start).getDate()} a {formatShortDate(w.week.end)}
              </span>
              <span className="font-num font-semibold text-expense">+ {formatMoney(w.spent - w.limit, { cents: false })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
