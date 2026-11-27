import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useCards } from "../hooks/useCards";
import { cardVars } from "../features/cards/cardStyle";
import { useMonthBudget } from "../features/useMonthBudget";
import { MonthPaceCard, WeekPaceCard, WeeksCard } from "../features/budgetui/PaceCards";
import { todayKey } from "../features/useLedger";
import { useSelectedMonth } from "../app/MonthContext";
import { useMonthLedger, useMonthsSummary } from "../features/useLedger";
import { summarizeLedger, type CategoryTotal } from "../features/ledger";
import { chartColorVar, makeCategoryLookup } from "../features/categories";
import { cx } from "../lib/cx";
import { fromMonthIndex, monthIndex, monthNames, shortMonthName } from "../lib/dates";
import { MINUS, formatMoney, fromCents, toCents } from "../lib/money";
import { Button, ButtonLink } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { Segmented } from "../ui/Segmented";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadingCard, Skeleton } from "../ui/Skeleton";
import { GroupedBars, Legend } from "../ui/charts/GroupedBars";
import { Donut } from "../ui/charts/Donut";

type Range = "3" | "6" | "12";

const SERIES = [
  { label: "Receitas", color: "var(--income)" },
  { label: "Despesas", color: "var(--chart-2)" },
];

export function Reports() {
  const { month, year, setMonth } = useSelectedMonth();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<Range>("6");
  const ledger = useMonthLedger(month, year);
  const evolution = useMonthsSummary(month, year, Number(range));
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const breakdown = params.get("aba") === "receitas" ? "income" : "expense";
  const name = monthNames[month].toLowerCase();

  // Link direto para um mês (?mes=11&ano=2026), aplicado uma vez.
  useEffect(() => {
    const m = Number(params.get("mes"));
    const y = Number(params.get("ano"));
    if (m >= 1 && m <= 12 && y > 2000) setMonth(m - 1, y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => summarizeLedger(ledger.entries), [ledger.entries]);
  const cardsQuery = useCards();
  const byPayment = useMemo(() => {
    const totals = new Map<string | null, number>();
    for (const entry of ledger.entries) {
      if (entry.type !== "expense") continue;
      totals.set(entry.cardId, (totals.get(entry.cardId) ?? 0) + toCents(entry.amount));
    }
    const cards = cardsQuery.data ?? [];
    return [
      { key: "avista", label: "À vista", value: fromCents(totals.get(null) ?? 0), color: "var(--chart-6)" },
      ...cards
        .filter((card) => !card.archived || totals.has(card.id))
        .map((card) => ({ key: card.id, label: card.name, value: fromCents(totals.get(card.id) ?? 0), color: cardVars(card.color).background })),
    ];
  }, [ledger.entries, cardsQuery.data]);
  const hasCards = (cardsQuery.data ?? []).length > 0;
  const budget = useMonthBudget(month, year, ledger.entries, !ledger.isLoading && !ledger.isError).data;
  const today = todayKey();
  const isCurrent = budget ? today.startsWith(budget.key) : false;
  const savingsRate = summary.income > 0 ? summary.balance / summary.income : null;
  const previous = fromMonthIndex(monthIndex(year, month) - 1);
  const previousSummary = evolution.data.length >= 2 ? evolution.data[evolution.data.length - 2].summary : null;

  const setBreakdown = (value: "expense" | "income") => {
    const next = new URLSearchParams(params);
    if (value === "income") next.set("aba", "receitas");
    else next.delete("aba");
    setParams(next, { replace: true });
  };

  const header = (
    <PageHeader
      title="Relatórios"
      eyebrow={<span className="hidden lg:inline">{monthNames[month]} de {year}</span>}
      actions={
        <>
          <MonthSwitcher month={month} year={year} onChange={setMonth} />
          <ButtonLink to="/relatorios/historico" variant="secondary">
            Histórico
          </ButtonLink>
        </>
      }
    />
  );

  if (ledger.isError) {
    return (
      <>
        {header}
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar o relatório de {name}.</p>
            <Button variant="secondary" onClick={ledger.retry}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const byCategory = breakdown === "expense" ? summary.expenseByCategory : summary.incomeByCategory;
  const breakdownTotal = breakdown === "expense" ? summary.expense : summary.income;
  const slices = byCategory.map((item, index) => ({
    key: item.categoryId ?? "none",
    label: category(item.categoryId)?.name ?? "Sem categoria",
    value: item.total,
    color: chartColorVar(index),
  }));

  return (
    <>
      {header}

      <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi label="Receitas" loading={ledger.isLoading} region="Receitas do mês">
          <Money value={summary.income} kind="income" signed={false} size="lg" className="!text-[20px] min-[400px]:!text-[22px] lg:!text-[30px]" />
        </Kpi>
        <Kpi label="Despesas" loading={ledger.isLoading} region="Despesas do mês">
          <Money value={summary.expense} kind="expense" signed={false} size="lg" className="!text-[20px] min-[400px]:!text-[22px] lg:!text-[30px]" />
        </Kpi>
        <Kpi label={summary.balance >= 0 ? "Sobrou no mês" : "Faltou no mês"} loading={ledger.isLoading} region="Saldo do mês">
          <Money value={Math.abs(summary.balance)} size="lg" className="!text-[20px] min-[400px]:!text-[22px] lg:!text-[30px]" />
        </Kpi>
        <Card tone="hero" className="gap-2" aria-label="Taxa de poupança">
          <span className="text-sm text-on-hero-muted">Taxa de poupança</span>
          {ledger.isLoading ? (
            <Skeleton className="h-8 w-24 !bg-hero-track" />
          ) : (
            <span className="font-num text-[20px] font-semibold leading-tight lg:text-[30px]">
              {savingsRate === null ? "—" : `${Math.round(savingsRate * 100)}%`}
              <span className="lg:hidden">{savingsRate === null ? "" : " da renda"}</span>
            </span>
          )}
        </Card>
      </section>

      {budget?.hasBudget && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <MonthPaceCard points={budget.monthBurn} variable={budget.variable} monthEnd={budget.monthBurn.at(-1)?.x ?? `${budget.key}-28`} />
            {isCurrent && budget.week && <WeekPaceCard week={budget.week} points={budget.weekBurn} />}
          </div>
          <WeeksCard weeks={budget.weeks} today={today} />
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
        <Card>
          <CardHeader
            title="Evolução"
            action={
              <Segmented
                label="Período da evolução"
                value={range}
                onChange={setRange}
                className="w-40"
                options={[
                  { value: "3", label: "3m" },
                  { value: "6", label: "6m" },
                  { value: "12", label: "12m" },
                ]}
              />
            }
          />
          {evolution.isLoading ? (
            <LoadingCard label="Carregando evolução…" rows={2} />
          ) : evolution.isError ? (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="text-sm text-expense">Não foi possível carregar os meses anteriores.</p>
              <Button variant="secondary" onClick={evolution.retry}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <GroupedBars
                label="Receitas e despesas por mês"
                series={SERIES}
                groups={evolution.data.map((item) => ({
                  key: `${item.year}-${item.month}`,
                  label: shortMonthName(item.month).replace(/^./, (c) => c.toUpperCase()),
                  current: item.month === month && item.year === year,
                  values: [item.summary.income, item.summary.expense],
                }))}
              />
              <div className="border-t border-border pt-3">
                <p className="mb-1 text-[13px] text-muted">Sobrou no mês (R$)</p>
                <div className="flex justify-around gap-2">
                  {evolution.data.map((item) => (
                    <span
                      key={`${item.year}-${item.month}`}
                      className={cx(
                        "flex-1 text-center font-num text-[13px] font-semibold",
                        item.summary.balance < 0 && "text-expense",
                        item.month === month && item.year === year && "text-income",
                      )}
                    >
                      {item.summary.balance < 0 ? MINUS : ""}
                      {Math.round(Math.abs(item.summary.balance)).toLocaleString("pt-BR")}
                    </span>
                  ))}
                </div>
              </div>
              <Legend series={SERIES} />
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title={`Comparado a ${monthNames[previous.month].toLowerCase()}`}
            subtitle={previousSummary ? comparisonLine(summary.expense, previousSummary.expense) : undefined}
          />
          {evolution.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !previousSummary ? (
            <p className="text-sm text-muted">Sem dados do mês anterior.</p>
          ) : (
            <CategoryChanges current={summary.expenseByCategory} previous={previousSummary.expenseByCategory} label={(id) => category(id)?.name ?? "Sem categoria"} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
        <Card>
          <CardHeader
            title={breakdown === "expense" ? "Despesas por categoria" : "Receitas por categoria"}
            action={
              <Segmented
                label="Tipo do detalhamento"
                value={breakdown}
                onChange={setBreakdown}
                className="w-52"
                options={[
                  { value: "expense", label: "Despesas" },
                  { value: "income", label: "Receitas" },
                ]}
              />
            }
          />
          {ledger.isLoading ? (
            <LoadingCard label="Carregando categorias…" rows={3} />
          ) : !slices.length ? (
            <p className="text-sm text-muted">Nada {breakdown === "expense" ? "gasto" : "recebido"} em {name}.</p>
          ) : (
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:gap-6">
              <Donut
                label={breakdown === "expense" ? "Despesas por categoria" : "Receitas por categoria"}
                slices={slices}
                center={
                  <>
                    <span className="text-[13px] text-muted">Total</span>
                    <span className="font-num text-base font-semibold">{formatMoney(breakdownTotal)}</span>
                  </>
                }
              />
              <table className="w-full">
                <caption className="sr-only">{breakdown === "expense" ? "Despesas" : "Receitas"} por categoria</caption>
                <tbody>
                  {slices.map((slice) => (
                    <tr key={slice.key} className="border-t border-border first:border-t-0">
                      <th scope="row" className="py-2.5 text-left text-[15px] font-semibold">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
                          {slice.label}
                        </span>
                      </th>
                      <td className="py-2.5 text-right text-[13px] text-muted">{Math.round((slice.value / breakdownTotal) * 100)}%</td>
                      <td className="py-2.5 pl-3 text-right">
                        <Money value={slice.value} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={hasCards ? "Por forma de pagamento" : "Fixas e variáveis"} subtitle={`Despesas de ${name}`} />
          {ledger.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : hasCards ? (
            <>
              {byPayment.map((item) => (
                <ShareRow key={item.key} label={item.label} value={item.value} total={summary.expense} color={item.color} />
              ))}
              <p className="border-t border-border pt-3 text-[13px] text-muted">
                Fixas {formatMoney(summary.fixedExpense)} · Variáveis {formatMoney(summary.variableExpense)}
              </p>
            </>
          ) : (
            <>
              <ShareRow label="Recorrentes (fixas)" value={summary.fixedExpense} total={summary.expense} />
              <ShareRow label="Variáveis" value={summary.variableExpense} total={summary.expense} tone="expense" />
              <p className="border-t border-border pt-3 text-[13px] text-muted">
                As recorrentes entram sozinhas todo mês; o que dá para ajustar está nas variáveis.
              </p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function comparisonLine(current: number, previous: number) {
  const diff = fromCents(toCents(current) - toCents(previous));
  if (previous <= 0) return `Despesas: ${formatMoney(current)}`;
  const percent = (diff / previous) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? MINUS : "";
  const amount = formatMoney(Math.abs(diff));
  return `Despesas ${sign}${Math.abs(percent).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% (${amount} ${diff >= 0 ? "a mais" : "a menos"})`;
}

function CategoryChanges({
  current,
  previous,
  label,
}: {
  current: CategoryTotal[];
  previous: CategoryTotal[];
  label: (id: string | null) => string;
}) {
  const ids = new Set([...current, ...previous].map((item) => item.categoryId));
  const changes = [...ids]
    .map((id) => {
      const now = current.find((item) => item.categoryId === id)?.total ?? 0;
      const before = previous.find((item) => item.categoryId === id)?.total ?? 0;
      return { id, diff: fromCents(toCents(now) - toCents(before)) };
    })
    .filter((item) => item.diff !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4);
  if (!changes.length) return <p className="text-sm text-muted">Nenhuma categoria mudou.</p>;
  return (
    <ul>
      {changes.map((item) => {
        const up = item.diff > 0;
        return (
          <li key={item.id ?? "none"} className="flex min-h-14 items-center gap-3 border-t border-border first:border-t-0">
            {up ? (
              <ArrowUp size={18} aria-hidden="true" className="text-expense" />
            ) : (
              <ArrowDown size={18} aria-hidden="true" className="text-income" />
            )}
            <span className="flex-1 text-[15px] font-semibold">{label(item.id)}</span>
            <span className={cx("font-num text-[15px] font-semibold", up ? "text-expense" : "text-income")}>
              {up ? "+" : MINUS} {formatMoney(Math.abs(item.diff))}
              <span className="sr-only">{up ? " a mais" : " a menos"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ShareRow({
  label,
  value,
  total,
  tone = "primary",
  color,
}: {
  label: string;
  value: number;
  total: number;
  tone?: "primary" | "expense";
  /** Cor da barra (ex.: cor do cartão); sobrepõe o tom. */
  color?: string;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-right">
          <Money value={value} size="sm" /> <span className="text-[13px] text-muted">· {percent}%</span>
        </span>
      </div>
      {color ? (
        <div role="img" aria-label={`${label}: ${percent}% das despesas`} className="h-2 overflow-hidden rounded bg-surface-2">
          <div className="h-full rounded" style={{ width: `${percent}%`, background: color }} />
        </div>
      ) : (
        <ProgressBar value={value} max={total || 1} label={`${label}: ${percent}% das despesas`} tone={tone} />
      )}
    </div>
  );
}

function Kpi({ label, loading, region, children }: { label: string; loading: boolean; region: string; children: React.ReactNode }) {
  return (
    <Card className="gap-2" role="region" aria-label={region}>
      <span className="text-sm text-muted">{label}</span>
      {loading ? <Skeleton className="h-8 w-32" /> : children}
    </Card>
  );
}
