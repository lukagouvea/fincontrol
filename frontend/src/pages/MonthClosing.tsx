import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import { useCards } from "../hooks/useCards";
import { useGoals } from "../hooks/useGoals";
import { useMonthLedger } from "../features/useLedger";
import { useMonthBudget } from "../features/useMonthBudget";
import { monthResult, resultLabel } from "../features/history";
import { makeCategoryLookup } from "../features/categories";
import { SaveToGoalSheet } from "../features/goalsui/SaveToGoalSheet";
import type { Goal } from "../types/FinanceTypes";
import { isoToDateKey, monthNames } from "../lib/dates";
import { formatMoney, fromCents, sumMoney, toCents } from "../lib/money";
import { cx } from "../lib/cx";
import { Button, ButtonLink } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { ProgressBar } from "../ui/ProgressBar";
import { Sheet } from "../ui/Sheet";
import { LoadingCard } from "../ui/Skeleton";

/** Fechamento do mês (Fechamento.html): sobra, entradas, faturas pagas e categorias. */
export function MonthClosing() {
  const { month: param = "" } = useParams();
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(param);
  const year = valid ? Number(param.slice(0, 4)) : new Date().getFullYear();
  const month = valid ? Number(param.slice(5, 7)) - 1 : new Date().getMonth();
  const now = new Date();
  const current = year === now.getFullYear() && month === now.getMonth();
  const future = year * 12 + month > now.getFullYear() * 12 + now.getMonth();

  const ledger = useMonthLedger(month, year);
  const budget = useMonthBudget(month, year, ledger.entries, !ledger.isLoading && !ledger.isError);
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const cards = useCards();
  const goals = useGoals();
  const [choosing, setChoosing] = useState(false);
  const [saving, setSaving] = useState<Goal | null>(null);
  const name = monthNames[month];
  const title = `${name} ${year}`;

  if (!valid || future) {
    return (
      <>
        <PageHeader back="/relatorios/historico" title="Fechamento" />
        <Card>
          <EmptyState title="Mês indisponível" description="Escolha um mês no histórico." />
        </Card>
      </>
    );
  }
  if (ledger.isLoading || budget.isLoading || !budget.data) return <LoadingCard label="Carregando fechamento…" rows={5} />;

  const data = budget.data;
  const income = sumMoney(ledger.entries.filter((e) => e.type === "income" && !e.upcoming).map((e) => e.amount));
  const result = monthResult(data.spent, income, data.hasBudget ? data.total : null, current);
  const invoicesPaid = sumMoney(
    (cards.data ?? []).flatMap((card) => card.payments.filter((p) => isoToDateKey(p.paidAt).startsWith(param)).map((p) => p.amount)),
  );
  const ranked = [...data.categories].filter((row) => row.spent > 0 || row.limit).sort((a, b) => b.spent - a.spent);
  const top = ranked[0];
  const savedFromMonth = (goals.data ?? []).flatMap((goal) =>
    goal.contributions.filter((c) => c.sourceMonth === param).map((c) => ({ goal, amount: c.amount })),
  );
  const alreadySaved = sumMoney(savedFromMonth.map((item) => item.amount));
  const leftover = result.kind === "sobrou" ? fromCents(Math.max(0, toCents(result.amount) - toCents(alreadySaved))) : 0;

  return (
    <>
      <PageHeader back="/relatorios/historico" title={title} />
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4">
          <Card aria-label="Resultado do mês">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{current ? "Em andamento" : "Mês fechado"}</span>
              {data.hasBudget && (
                <Badge tone={result.kind === "passou" ? "expense" : "primary"}>{result.kind === "passou" ? "Passou do orçamento" : "Dentro do orçamento"}</Badge>
              )}
            </div>
            <p className={cx("font-num text-[30px] font-semibold leading-tight", result.kind === "passou" && "text-expense")}>{resultLabel(result, formatMoney)}</p>
            <p className="text-[13px] text-muted">
              {data.hasBudget
                ? `Você gastou ${formatMoney(data.spent)} de ${formatMoney(data.total)}.`
                : `Entradas de ${formatMoney(income)} e gastos de ${formatMoney(data.spent)}.`}
            </p>
            {data.hasBudget && <ProgressBar value={data.spent} max={data.total} tone={result.kind === "passou" ? "expense" : "primary"} label="Gasto do orçamento" />}
            <dl className="flex flex-col">
              {[
                ["Entradas", formatMoney(income)],
                ["Faturas pagas", formatMoney(invoicesPaid)],
                ["Maior gasto", top ? `${top.categoryId ? category(top.categoryId)?.name ?? "Sem categoria" : "Geral"} · ${formatMoney(top.spent)}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex min-h-12 items-center justify-between gap-3 border-t border-border">
                  <dt className="text-[15px] text-muted">{label}</dt>
                  <dd className="text-[15px] font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {savedFromMonth.length > 0 && (
            <Card>
              <CardHeader title="Sobra guardada" />
              <ul>
                {savedFromMonth.map((item, i) => (
                  <li key={i} className="flex min-h-12 items-center justify-between gap-3 border-t border-border first:border-t-0">
                    <span className="text-[15px]">{item.goal.name}</span>
                    <span className="font-num font-semibold">{formatMoney(item.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {!current && leftover > 0 && (
            <Button size="lg" block onClick={() => setChoosing(true)}>
              Guardar a sobra numa meta
            </Button>
          )}
          <ButtonLink to={`/relatorios?mes=${month + 1}&ano=${year}`} variant="link" className="self-center">
            Ver relatório de {name.toLowerCase()}
          </ButtonLink>
        </div>
        <Card>
          <CardHeader title="Por categoria" />
          {!ranked.length ? (
            <p className="text-sm text-muted">Nenhum gasto em {name.toLowerCase()}.</p>
          ) : (
            <ul className="flex flex-col">
              {ranked.map((row) => {
                const over = row.limit !== null && row.spent > row.limit;
                return (
                  <li key={row.categoryId ?? "geral"} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0">
                    <span className="flex justify-between gap-3 text-[15px]">
                      <span className="font-semibold">{row.categoryId ? category(row.categoryId)?.name ?? "Sem categoria" : "Geral"}</span>
                      <span>
                        <span className={cx("font-semibold", over && "text-expense")}>{formatMoney(row.spent)}</span>
                        {row.limit !== null && <span className="text-muted"> de {formatMoney(row.limit)}</span>}
                      </span>
                    </span>
                    {row.limit !== null && <ProgressBar value={row.spent} max={row.limit} tone={over ? "expense" : "primary"} label={over ? "Acima do limite" : "Dentro do limite"} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Guardar a sobra" description={`Sobraram ${formatMoney(leftover)} em ${name.toLowerCase()}. Em qual meta guardar?`}>
        {!(goals.data ?? []).length ? (
          <EmptyState title="Nenhuma meta" description="Crie uma meta para guardar a sobra." action={<ButtonLink to="/metas">Criar meta</ButtonLink>} />
        ) : (
          <ul>
            {(goals.data ?? []).map((goal) => (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChoosing(false);
                    setSaving(goal);
                  }}
                  className="-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center justify-between gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="text-[15px] font-semibold">{goal.name}</span>
                  <span className="text-[13px] text-muted">
                    {formatMoney(goal.saved)} de {formatMoney(goal.target)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
      <SaveToGoalSheet goal={saving} initialAmount={leftover} sourceMonth={param} onClose={() => setSaving(null)} />
    </>
  );
}
