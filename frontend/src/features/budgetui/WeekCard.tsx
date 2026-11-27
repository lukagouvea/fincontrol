import { Link } from "react-router-dom";
import type { WeekStatus } from "../budget";
import { formatShortDate, parseDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Card } from "../../ui/Card";
import { Money } from "../../ui/Money";
import { ProgressBar } from "../../ui/ProgressBar";

const DAY_LABELS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function weekMessage(week: WeekStatus) {
  if (week.state === "passou") return `Você passou ${formatMoney(week.spent - week.limit)} do limite da semana.`;
  if (week.state === "atencao") return `Atenção: você já usou ${Math.round(week.ratio * 100)}% do limite da semana.`;
  return `No ritmo: cerca de ${formatMoney(week.perDay, { cents: false })} por dia até domingo.`;
}

/** "Esta semana": quanto resta até domingo, gasto × limite e gasto por dia. */
export function WeekCard({ week, today, layout }: { week: WeekStatus; today: string; layout: "stack" | "wide" }) {
  const start = parseDateKey(week.week.start);
  const end = parseDateKey(week.week.end);
  const range =
    start.getMonth() === end.getMonth()
      ? `${start.getDate()} a ${formatShortDate(week.week.end)}`
      : `${formatShortDate(week.week.start)} a ${formatShortDate(week.week.end)}`;
  const maxDay = Math.max(week.limit / 7, ...week.days.map((d) => d?.spent ?? 0), 1);
  const tone = week.state === "passou" ? "bg-expense-tint text-expense" : week.state === "atencao" ? "bg-[var(--card-laranja-tint)] text-ink" : "bg-primary-tint text-ink";

  const info = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">
          Esta semana <span className="font-normal text-muted lg:text-ink lg:font-semibold">· {range}</span>
        </h2>
        <Link to="/relatorios" className="-my-2 inline-flex min-h-tap items-center text-sm font-semibold text-primary hover:underline">
          Ver ritmo
        </Link>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <Money value={Math.max(0, week.left)} size="lg" />
        <span className="text-[15px] text-muted">{week.left >= 0 ? "para gastar até domingo" : "acima do limite"}</span>
      </p>
      <ProgressBar value={week.spent} max={week.limit || 1} tone={week.state === "passou" ? "expense" : "primary"} label={`${Math.round(week.ratio * 100)}% do limite da semana usado`} />
      <div className="flex justify-between gap-3 text-[13px] text-muted">
        <span>Gasto {formatMoney(week.spent)}</span>
        <span>Limite {formatMoney(week.limit)}</span>
      </div>
    </div>
  );

  const bars = (
    <div className="flex flex-col gap-3">
      <figure aria-label="Gasto por dia da semana" className="flex items-end gap-2">
        {week.days.map((day, i) => {
          const isToday = day?.date === today;
          return (
            <div key={DAY_LABELS[i]} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-12 w-full items-end" role="img" aria-label={day ? `${DAY_LABELS[i]}: ${formatMoney(day.spent)}` : `${DAY_LABELS[i]}: fora do mês`}>
                <span
                  aria-hidden="true"
                  className={cx("w-full rounded-t-md", day && day.spent > 0 ? "bg-chart-4" : "", isToday ? "border-b-2 border-ink" : "border-b-2 border-border")}
                  style={{ height: day && day.spent > 0 ? `${Math.max(8, (day.spent / maxDay) * 100)}%` : "2px" }}
                />
              </div>
              <span aria-hidden="true" className={cx("text-xs", isToday ? "font-semibold text-ink" : "text-muted")}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </figure>
      <p className={cx("rounded-2xl px-3 py-2 text-[13px]", tone)}>{weekMessage(week)}</p>
    </div>
  );

  return (
    <Card aria-label="Esta semana" className={cx(layout === "wide" && "lg:grid lg:grid-cols-2 lg:gap-6")}>
      {info}
      {bars}
    </Card>
  );
}
