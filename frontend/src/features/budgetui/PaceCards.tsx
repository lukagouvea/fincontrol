import type { Burn, BurnForecast, BurnPoint, PaceKind, WeekStatus } from "../budget";
import { formatShortDate, parseDateKey } from "../../lib/dates";
import { formatMoney, MINUS } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Chip";
import { Burndown } from "../../ui/charts/Burndown";
import { weekMessage } from "./WeekCard";

function pace(points: BurnPoint[]) {
  const last = points.reduce<BurnPoint | null>((found, p) => (p.real !== null ? p : found), null);
  if (!last) return { ahead: false, diff: 0 };
  return { ahead: last.real! < last.ideal, diff: last.ideal - last.real! };
}

/** Valor do restante sem centavos, com "−" quando passou do limite. */
const whole = (value: number) => `${value < 0 ? `${MINUS} ` : ""}${formatMoney(Math.abs(value), { cents: false })}`;

/** Percentual sem arredondar para 0% ou 100% quando não é certeza. */
export function chance(p: number) {
  const pct = Math.round(p * 100);
  return `${p > 0 && pct === 0 ? 1 : p < 1 && pct === 100 ? 99 : pct}%`;
}

/** Textos de cada referência (orçamento, renda − fixas, mês típico). */
const COPY: Record<
  PaceKind,
  {
    monthHint: string;
    weekHint: string;
    weekRef: string;
    weeksHint: string;
    /** "do limite da semana", para "você já usou 85% …" e "você passou R$ 40 …". */
    ofWeek: string;
    within: string;
    weekWithin: string;
    left: (value: string) => string;
    over: (value: string) => string;
  }
> = {
  budget: {
    monthHint: "Orçamento variável que resta, em R$, por dia do mês",
    weekHint: "Limite da semana que resta, em R$, por dia",
    weekRef: "limite",
    weeksHint: "Gasto variável contra o limite de cada semana",
    ofWeek: "do limite da semana",
    within: "Chance de fechar dentro do limite",
    weekWithin: "Chance de fechar a semana dentro do limite",
    left: (v) => `Deve sobrar ~${v}`,
    over: (v) => `Deve passar do limite em ~${v}`,
  },
  income: {
    monthHint: "Sem orçamento: o que resta da renda menos as fixas, em R$, por dia do mês",
    weekHint: "Parte da renda da semana que resta, em R$, por dia",
    weekRef: "parte da renda",
    weeksHint: "Gasto variável contra a parte da renda de cada semana",
    ofWeek: "da parte da renda da semana",
    within: "Chance de não gastar mais do que entrou",
    weekWithin: "Chance de fechar a semana dentro da renda",
    left: (v) => `Deve sobrar ~${v} da renda`,
    over: (v) => `Deve faltar ~${v} da renda`,
  },
  typical: {
    monthHint: "Sem orçamento: o que resta do seu mês típico (mediana dos 3 meses anteriores), em R$, por dia do mês",
    weekHint: "Semana típica que resta, em R$, por dia",
    weekRef: "semana típica",
    weeksHint: "Gasto variável contra uma semana típica",
    ofWeek: "de uma semana típica",
    within: "Chance de gastar menos que no mês típico",
    weekWithin: "Chance de gastar menos que numa semana típica",
    left: (v) => `Deve fechar ~${v} abaixo do mês típico`,
    over: (v) => `Deve fechar ~${v} acima do mês típico`,
  },
};

/** "Deve sobrar ~R$ 320 (restante entre R$ 80 e R$ 540). Chance de fechar dentro do limite: 78%." */
export function forecastMessage(forecast: BurnForecast, kind: PaceKind = "budget") {
  const { p10, p50, p90, pWithin } = forecast;
  const copy = COPY[kind];
  const main = p50 >= 0 ? copy.left(whole(p50)) : copy.over(whole(-p50));
  const range = p10 === p90 ? "" : ` (restante entre ${whole(p10)} e ${whole(p90)})`;
  return `${main}${range}. ${copy.within}: ${chance(pWithin)}.`;
}

/** Mensagem da semana; com orçamento é a mesma do card "Esta semana" da Início. */
export function paceWeekMessage(week: WeekStatus, kind: PaceKind) {
  if (kind === "budget" || week.state === "ok") return weekMessage(week);
  const { ofWeek } = COPY[kind];
  if (week.state === "passou") return `Você passou ${formatMoney(week.spent - week.limit)} ${ofWeek}.`;
  return `Atenção: você já usou ${Math.round(week.ratio * 100)}% ${ofWeek}.`;
}

/** Ritmo do mês: referência variável (orçamento, renda ou mês típico) restante por dia. */
export function MonthPaceCard({ burn, variable, monthEnd, kind = "budget" }: { burn: Burn; variable: number; monthEnd: string; kind?: PaceKind }) {
  const { points, forecast } = burn;
  const { ahead, diff } = pace(points);
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
      <p className="text-[13px] text-muted">{COPY[kind].monthHint}</p>
      <Burndown points={points} budget={variable} label="Ritmo do mês" />
      <p className={cx("rounded-2xl px-3 py-2 text-[13px]", ahead ? "bg-surface-2" : "bg-primary-tint")}>
        {ahead ? `Até hoje você gastou ${formatMoney(diff)} a mais que o ideal.` : `Até hoje você está ${formatMoney(-diff)} abaixo do ideal.`}{" "}
        {forecast && forecastMessage(forecast, kind)}
      </p>
    </Card>
  );
}

/** Ritmo da semana: referência da semana restante por dia. */
export function WeekPaceCard({ week, burn, kind = "budget" }: { week: WeekStatus; burn: Burn; kind?: PaceKind }) {
  const copy = COPY[kind];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Ritmo da semana</h2>
          <p className="text-[13px] text-muted">
            {formatShortDate(week.week.start)} a {formatShortDate(week.week.end)} · {copy.weekRef} {formatMoney(week.limit)}
          </p>
        </div>
        <Badge tone={week.state === "ok" ? "primary" : "expense"}>{week.state === "ok" ? "No ritmo" : week.state === "atencao" ? "Atenção" : "Passou"}</Badge>
      </div>
      <p className="text-[13px] text-muted">{copy.weekHint}</p>
      <Burndown points={burn.points.map((p) => ({ ...p, label: ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][parseDateKey(p.x).getDay()] }))} budget={week.limit} label="Ritmo da semana" />
      <p className={cx("rounded-2xl px-3 py-2 text-[13px]", week.state === "ok" ? "bg-primary-tint" : "bg-expense-tint text-expense")}>
        {paceWeekMessage(week, kind)}
        {burn.forecast && ` ${copy.weekWithin}: ${chance(burn.forecast.pWithin)}.`}
      </p>
    </Card>
  );
}

/** Semana a semana: gasto variável × referência de cada semana do mês. */
export function WeeksCard({ weeks, today, kind = "budget" }: { weeks: WeekStatus[]; today: string; kind?: PaceKind }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.spent, w.limit]));
  const over = weeks.filter((w) => w.week.start <= today && w.spent > w.limit);
  return (
    <Card>
      <div>
        <h2 className="text-[15px] font-semibold">Semana a semana</h2>
        <p className="text-[13px] text-muted">{COPY[kind].weeksHint}</p>
      </div>
      <figure aria-label="Gasto por semana" className="flex items-end gap-1.5 min-[400px]:gap-3">
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
              <span aria-hidden="true" className={cx("whitespace-nowrap text-xs", current ? "font-semibold text-ink" : "text-muted")}>
                {parseDateKey(w.week.start).getDate()}–{parseDateKey(w.week.end).getDate()}
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
