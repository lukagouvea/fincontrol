import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, Bell, CalendarClock, ChartNoAxesColumn, Plus, Repeat, Settings } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useSelectedMonth } from "../app/MonthContext";
import { usePendingDeletes } from "../app/PendingDeletes";
import { useTransactionEditor } from "../app/TransactionEditor";
import { useMonthLedger, todayKey } from "../features/useLedger";
import { summarizeLedger, type LedgerEntry } from "../features/ledger";
import { chartColorVar, makeCategoryLookup, type CategoryLookup } from "../features/categories";
import { cx } from "../lib/cx";
import { formatRelativeDay, monthIndex, monthLabel, monthNames, parseDateKey, shortMonthName } from "../lib/dates";
import { formatMoney, sumMoney } from "../lib/money";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { LoadingCard, Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { CategoryIcon } from "../ui/CategoryIcon";
import { StackedBar, topSegments, type StackedSegment } from "../ui/charts/StackedBar";

type Period = "past" | "current" | "future";

export function Home() {
  const { month, year, setMonth } = useSelectedMonth();
  const ledger = useMonthLedger(month, year);
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const { hidden } = usePendingDeletes();
  const editor = useTransactionEditor();
  const today = todayKey();

  const now = new Date();
  const offset = monthIndex(year, month) - monthIndex(now.getFullYear(), now.getMonth());
  const period: Period = offset < 0 ? "past" : offset > 0 ? "future" : "current";
  const name = monthNames[month].toLowerCase();

  const entries = useMemo(() => ledger.entries.filter((entry) => !hidden.has(entry.key)), [ledger.entries, hidden]);
  // No mês atual, "gasto" é o que já aconteceu; no futuro é previsão.
  const summary = useMemo(() => summarizeLedger(entries, { untilToday: period === "current" }), [entries, period]);
  const upcoming = useMemo(
    () => entries.filter((entry) => entry.upcoming).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries],
  );
  const toPay = sumMoney(upcoming.filter((entry) => entry.type === "expense").map((entry) => entry.amount));
  const recent = entries.filter((entry) => !entry.upcoming).slice(0, 5);
  const nextRecurring = upcoming.find((entry) => entry.source === "recurring");

  const segments: StackedSegment[] = summary.expenseByCategory.map((item, index) => ({
    key: item.categoryId ?? "none",
    label: category(item.categoryId)?.name ?? "Sem categoria",
    value: item.total,
    color: chartColorVar(index),
  }));
  const distribution = topSegments(segments, 6, "var(--chart-6)");

  const spentLabel = period === "future" ? `Previsto para ${name}` : `Gasto em ${name}`;
  const sobrou = summary.balance;

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-muted lg:font-normal">{monthLabel(month, year)}</span>
        <h1 className="hidden font-num text-[32px] font-semibold tracking-[-0.01em] lg:block">Início</h1>
        <h1 className="sr-only lg:hidden">Início</h1>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <Link to="/ajustes" aria-label="Ajustes" className={iconLink + " lg:hidden"}>
          <Settings size={20} aria-hidden="true" />
        </Link>
        <Link to="/alertas" aria-label="Alertas" className={iconLink}>
          <Bell size={20} aria-hidden="true" />
        </Link>
        <span className="hidden lg:inline-flex">
          <MonthSwitcher month={month} year={year} onChange={setMonth} />
        </span>
        <Button className="hidden lg:inline-flex" icon={<Plus size={18} aria-hidden="true" />} onClick={() => editor.create()}>
          Nova transação
        </Button>
      </div>
    </header>
  );

  if (ledger.isError) {
    return (
      <>
        {header}
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar o resumo de {name}.</p>
            <Button variant="secondary" onClick={ledger.retry}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      {header}

      {/* Mobile: valor grande solto; desktop: 4 cartões */}
      <section aria-label="Resumo do mês" className="flex flex-col gap-3 lg:hidden">
        {ledger.isLoading ? (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">Carregando resumo…</span>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-56" />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <span className="text-[15px] text-ink-2">{spentLabel}</span>
            <Money value={summary.expense} size="hero" />
            <span className="rounded-full bg-primary-tint px-3 py-1.5 text-sm font-semibold text-primary">
              {sobrou >= 0 ? `Sobrou ${formatMoney(sobrou)}` : `Faltou ${formatMoney(-sobrou)}`}
              {period === "current" ? " até agora" : ""}
            </span>
          </div>
        )}
      </section>

      <section aria-label="Resumo do mês" className="hidden gap-4 lg:grid lg:grid-cols-4">
        <Card tone="hero" className="gap-2.5">
          <span className="text-sm text-on-hero-muted">{spentLabel}</span>
          {ledger.isLoading ? <Skeleton className="h-8 w-40 !bg-hero-track" /> : <Money value={summary.expense} size="lg" />}
          <span className="text-[13px] text-on-hero-muted">
            {summary.fixedExpense > 0
              ? `${formatMoney(summary.fixedExpense)} em recorrentes`
              : "Nenhuma recorrente no período"}
          </span>
        </Card>
        <Kpi label="Entradas" loading={ledger.isLoading} value={summary.income} kind="income">
          {period === "current" ? "Recebido até hoje" : `Total de ${name}`}
        </Kpi>
        <Kpi label={sobrou >= 0 ? "Sobrou" : "Faltou"} loading={ledger.isLoading} value={Math.abs(sobrou)} kind={sobrou >= 0 ? "neutral" : "expense"}>
          Entradas menos gastos{period === "current" ? " até agora" : ""}
        </Kpi>
        <Kpi label="A pagar no mês" loading={ledger.isLoading} value={toPay} kind="neutral">
          {upcoming.some((entry) => entry.type === "expense")
            ? `Próximo: ${upcoming.find((entry) => entry.type === "expense")!.description}, ${formatRelativeDay(upcoming.find((entry) => entry.type === "expense")!.date, today, { short: true }).toLowerCase()}`
            : "Nada previsto até o fim do mês"}
        </Kpi>
      </section>

      {/* Mobile: atalhos */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <Tile icon={<ArrowDown size={18} />} label="Entradas">
          <Money value={summary.income} kind="income" signed={false} size="md" className="text-[20px]" />
        </Tile>
        <Tile icon={<CalendarClock size={18} />} label="A pagar">
          <Money value={toPay} size="md" className="text-[20px]" />
        </Tile>
        <TileLink to="/recorrentes" icon={<Repeat size={20} />} title="Recorrentes">
          {nextRecurring ? `Próxima: ${formatRelativeDay(nextRecurring.date, today, { short: true }).toLowerCase()}` : "Nada previsto"}
        </TileLink>
        <TileLink to="/relatorios" icon={<ChartNoAxesColumn size={20} />} title="Relatórios">
          Ver o mês
        </TileLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Card>
          <CardHeader title="Para onde foi o dinheiro" action={{ label: "Detalhes", to: "/relatorios" }} />
          {ledger.isLoading ? (
            <Skeleton className="h-3 w-full" />
          ) : !distribution.length ? (
            <p className="text-sm text-muted">Nenhum gasto {period === "future" ? "previsto" : "registrado"} em {name}.</p>
          ) : (
            <>
              <StackedBar segments={distribution} label="Gastos por categoria" />
              <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:hidden">
                {distribution.slice(0, 3).map((segment) => (
                  <li key={segment.key} className="flex items-center gap-1.5 text-sm">
                    <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: segment.color }} />
                    {segment.label}
                  </li>
                ))}
              </ul>
              <table className="hidden w-full lg:table">
                <caption className="sr-only">Gastos por categoria</caption>
                <tbody>
                  {distribution.map((segment) => (
                    <tr key={segment.key} className="border-t border-border">
                      <th scope="row" className="py-2.5 text-left text-[15px] font-semibold">
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: segment.color }} />
                          {segment.label}
                        </span>
                      </th>
                      <td className="py-2.5 text-right text-[13px] text-muted">
                        {Math.round((segment.value / summary.expense) * 100)}%
                      </td>
                      <td className="w-32 py-2.5 text-right">
                        <Money value={segment.value} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>

        <Card className="hidden lg:flex">
          <CardHeader title="Próximos dias" action={{ label: "Ver recorrentes", to: "/recorrentes" }} />
          {ledger.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !upcoming.length ? (
            <p className="text-sm text-muted">
              {period === "past" ? `${monthNames[month]} já fechou.` : `Nada previsto até o fim de ${name}.`}
            </p>
          ) : (
            <ul className="flex flex-col">
              {upcoming.slice(0, 4).map((entry) => (
                <UpcomingRow key={entry.key} entry={entry} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Últimas transações" action={{ label: "Ver todas", to: "/transacoes" }} />
        {ledger.isLoading ? (
          <LoadingCard label="Carregando transações…" rows={3} />
        ) : !recent.length ? (
          <EmptyState
            title={`Nada registrado em ${name}`}
            description="Seus gastos e receitas aparecem aqui assim que você registrar."
            action={
              <Button size="lg" icon={<Plus size={18} aria-hidden="true" />} onClick={() => editor.create()}>
                Adicionar transação
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col">
            {recent.map((entry) => (
              <RecentRow key={entry.key} entry={entry} category={category} today={today} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

const iconLink =
  "inline-flex size-tap items-center justify-center rounded-full border border-border bg-surface text-ink hover:bg-surface-2 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Kpi({
  label,
  value,
  kind,
  loading,
  children,
}: {
  label: string;
  value: number;
  kind: "income" | "expense" | "neutral";
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-2.5">
      <span className="text-sm text-muted">{label}</span>
      {loading ? <Skeleton className="h-8 w-36" /> : <Money value={value} kind={kind} signed={false} size="lg" />}
      <span className="text-[13px] text-muted">{children}</span>
    </Card>
  );
}

function Tile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
      <span className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function TileLink({ to, icon, title, children }: { to: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
    >
      <span aria-hidden="true" className="text-ink-2">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block truncate text-[13px] text-muted">{children}</span>
      </span>
    </Link>
  );
}

function UpcomingRow({ entry }: { entry: LedgerEntry }) {
  const date = parseDateKey(entry.date);
  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border first:border-t-0">
      <span className="flex size-tap shrink-0 flex-col items-center justify-center rounded-tile bg-surface-2 leading-none">
        <span className="font-num text-base font-semibold">{date.getDate()}</span>
        <span className="text-[10px] font-semibold uppercase text-muted">{shortMonthName(date.getMonth())}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{entry.description}</span>
        <span className="block text-[13px] text-muted">{entry.source === "recurring" ? "Recorrente" : entry.installment ? `Parcela ${entry.installment.current} de ${entry.installment.total}` : "Agendada"}</span>
      </span>
      <Money value={entry.amount} kind={entry.type} size="sm" />
    </li>
  );
}

function RecentRow({ entry, category, today }: { entry: LedgerEntry; category: CategoryLookup; today: string }) {
  const cat = category(entry.categoryId);
  return (
    <li>
      <Link
        to={`/transacoes?t=${encodeURIComponent(entry.key)}`}
        className={cx(
          "-mx-2 flex min-h-16 items-center gap-3 rounded-tile px-2 hover:bg-surface-2",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
        )}
      >
        <CategoryIcon category={cat} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{entry.description}</span>
          <span className="block truncate text-[13px] text-muted">
            {[cat?.name ?? "Sem categoria", entry.source === "recurring" ? "Recorrente" : null, formatRelativeDay(entry.date, today, { short: true }).toLowerCase()]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <Money value={entry.amount} kind={entry.type} />
      </Link>
    </li>
  );
}
