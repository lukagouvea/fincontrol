import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useHistory } from "../features/useHistory";
import { historyStats, monthResult, resultLabel, type HistoryRow } from "../features/history";
import { monthNames, shortMonthName } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { cx } from "../lib/cx";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { Segmented } from "../ui/Segmented";
import { LoadingCard } from "../ui/Skeleton";

const capital = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

function SpendChart({ rows }: { rows: HistoryRow[] }) {
  const budget = rows.find((row) => row.budget)?.budget ?? null;
  const max = Math.max(1, ...rows.map((row) => row.spent), budget ?? 0);
  return (
    <figure aria-label="Gasto por mês" className="flex flex-col gap-1">
      <div className="relative flex h-40 items-end gap-2 pt-4">
        {budget && (
          <div aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-ink" style={{ bottom: `calc(${(budget / max) * 100}% * (136 / 160))` }}>
            <span className="absolute -top-4 left-0 text-[11px] text-ink-2">Orçamento {formatMoney(budget, { cents: false })}</span>
          </div>
        )}
        {rows.map((row) => {
          const over = row.budget !== null && row.spent > row.budget;
          return (
            <div key={row.key} className="flex h-full flex-1 flex-col items-center justify-end" role="img" aria-label={`${monthNames[row.month]}: ${formatMoney(row.spent)}`}>
              <span
                aria-hidden="true"
                className={cx("flex w-full max-w-[56px] items-start justify-center rounded-t-lg pt-1 font-num text-[11px] font-semibold", over ? "bg-chart-2 text-on-primary" : row.current ? "bg-primary text-on-primary" : "bg-chart-4 text-ink")}
                style={{ height: `${Math.max(14, (row.spent / max) * 85)}%` }}
              >
                {Math.round(row.spent).toLocaleString("pt-BR")}
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex gap-2 text-[12px] text-muted">
        {rows.map((row) => (
          <span key={row.key} className={cx("flex-1 text-center", row.current && "font-semibold text-ink")}>
            {capital(shortMonthName(row.month))}
          </span>
        ))}
      </div>
    </figure>
  );
}

function ResultText({ row }: { row: HistoryRow }) {
  const result = monthResult(row.spent, row.income, row.budget, row.current);
  return <span className={cx("text-[13px] font-semibold", result.kind === "passou" ? "text-expense" : "text-income")}>{resultLabel(result, formatMoney)}</span>;
}

export function History() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [range, setRange] = useState<"6" | "12">("6");
  const history = useHistory(Number(range));
  const rows = history.rows;
  const stats = historyStats(rows);
  const ordered = [...rows].reverse();

  return (
    <>
      <PageHeader
        back="/relatorios"
        title="Histórico"
        eyebrow={<span className="hidden lg:inline">Relatórios</span>}
        actions={
          <Segmented
            label="Período do histórico"
            value={range}
            onChange={setRange}
            className="w-36"
            options={[
              { value: "6", label: "6m" },
              { value: "12", label: "12m" },
            ]}
          />
        }
      />
      {history.isLoading ? (
        <LoadingCard label="Carregando histórico…" rows={5} />
      ) : history.isError ? (
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar o histórico.</p>
            <Button variant="secondary" onClick={history.retry}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
            <Card className={desktop ? "order-1" : "order-2"}>
              <CardHeader title="Gasto por mês" />
              <SpendChart rows={rows} />
            </Card>
            <Card className={desktop ? "order-2" : "order-1"} aria-label="Resumo do histórico">
              <span className="text-sm text-muted">Gasto médio nos últimos {stats.closed} {stats.closed === 1 ? "mês" : "meses"}</span>
              <Money value={stats.average} size="lg" />
              {stats.withBudget > 0 && (
                <span className="text-[13px] text-muted">
                  Dentro do orçamento em {stats.within} de {stats.withBudget} {stats.withBudget === 1 ? "mês" : "meses"}.
                </span>
              )}
              {stats.best && stats.worst && stats.closed > 1 && (
                <dl className="hidden flex-col lg:flex">
                  {[
                    ["Melhor mês", stats.best],
                    ["Pior mês", stats.worst],
                  ].map(([label, item]) => {
                    const entry = item as (typeof stats)["best"];
                    return (
                      <div key={label as string} className="flex min-h-12 items-center justify-between gap-3 border-t border-border">
                        <dt className="text-[15px] text-muted">{label as string}</dt>
                        <dd className="text-[15px] font-semibold">
                          {capital(shortMonthName(entry.row.month))} · {resultLabel(entry.result, formatMoney).replace(/^./, (c) => c.toLowerCase())}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Mês a mês" />
            <ul>
              {ordered.map((row) => (
                <li key={row.key} className="border-t border-border first:border-t-0">
                  <Link
                    to={`/relatorios/historico/${row.key}`}
                    className="-mx-2 flex min-h-16 items-center gap-3 rounded-tile px-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {monthNames[row.month]} {row.year}
                      </span>
                      <span className="block text-[13px] text-muted">{row.current ? "em andamento" : "fechado"}</span>
                    </span>
                    {desktop && (
                      <>
                        <span className="w-32 text-right text-[13px] text-muted">{row.budget ? `de ${formatMoney(row.budget)}` : "sem orçamento"}</span>
                        <span className="w-32 text-right">
                          <Money value={row.income} kind="income" signed={false} size="sm" />
                        </span>
                      </>
                    )}
                    <span className="flex flex-col items-end">
                      <Money value={row.spent} size="sm" />
                      <ResultText row={row} />
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
