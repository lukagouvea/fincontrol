import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronRight, Plus } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useFixedExpenses, useFixedIncomes } from "../hooks/useFixedTransactions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedMonth } from "../app/MonthContext";
import { useMonthLedger, todayKey } from "../features/useLedger";
import { BillCheckButton } from "../features/billsui/BillControls";
import { billLabel } from "../features/bills";
import { summarizeLedger, type EntryType, type LedgerEntry } from "../features/ledger";
import { makeCategoryLookup, type CategoryLookup } from "../features/categories";
import { RecurringSheet, type RecurringSheetState } from "../features/recurring/RecurringSheet";
import { VariationSheet } from "../features/transactions/VariationSheet";
import type { FixedTransaction } from "../types/FinanceTypes";
import { getFixedItemVersion } from "../utils/financeUtils";
import { cx } from "../lib/cx";
import { formatRelativeDay, isoToDateKey, monthNames, formatShortDate, parseDateKey, shortMonthName } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { ProgressBar } from "../ui/ProgressBar";
import { LoadingCard } from "../ui/Skeleton";

type Rule = { item: FixedTransaction; type: EntryType };

export function Recurring() {
  const { month, year, setMonth } = useSelectedMonth();
  const [params, setParams] = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const incomes = useFixedIncomes();
  const expenses = useFixedExpenses();
  const ledger = useMonthLedger(month, year);
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const [sheet, setSheet] = useState<RecurringSheetState | null>(null);
  const [variation, setVariation] = useState<LedgerEntry | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const today = todayKey();
  const name = monthNames[month].toLowerCase();

  const rules: Rule[] = useMemo(
    () => [
      ...(expenses.data ?? []).map((item) => ({ item, type: "expense" as const })),
      ...(incomes.data ?? []).map((item) => ({ item, type: "income" as const })),
    ],
    [expenses.data, incomes.data],
  );

  const occurrences = ledger.entries.filter((entry) => entry.source === "recurring");
  const occurringIds = new Set(occurrences.map((entry) => entry.id));
  const ended = rules.filter(({ item }) => item.endDate && isoToDateKey(item.endDate) < today);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const paused = rules.filter(
    (rule) => !!rule.item.pausedFrom && monthKey >= rule.item.pausedFrom && monthKey <= (rule.item.pausedUntil ?? rule.item.pausedFrom),
  );
  const later = rules.filter(
    (rule) => !occurringIds.has(rule.item.id) && !ended.includes(rule) && isoToDateKey(rule.item.startDate) > today,
  );
  const upcoming = occurrences.filter((entry) => entry.upcoming).sort((a, b) => (a.date < b.date ? -1 : 1));
  const launched = occurrences.filter((entry) => !entry.upcoming).sort((a, b) => (a.date < b.date ? -1 : 1));

  const summary = summarizeLedger(ledger.entries);
  const fixedShare = summary.expense > 0 ? summary.fixedExpense / summary.expense : 0;
  const activeExpenseCount = occurrences.filter((entry) => entry.type === "expense").length;

  // Abre a edição vinda de outra tela (/recorrentes?editar=<id>).
  const editId = params.get("editar");
  useEffect(() => {
    if (!editId || !rules.length) return;
    const rule = rules.find((r) => r.item.id === editId);
    if (rule) setSheet({ kind: "edit", item: rule.item, type: rule.type });
    const next = new URLSearchParams(params);
    next.delete("editar");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, rules.length]);

  const open = (id: string) => {
    const rule = rules.find((r) => r.item.id === id);
    if (rule) setSheet({ kind: "edit", item: rule.item, type: rule.type });
  };
  const editingOccurrence = sheet?.kind === "edit" ? occurrences.find((entry) => entry.id === sheet.item.id) : undefined;

  const loading = ledger.isLoading || incomes.isPending || expenses.isPending;
  const failed = ledger.isError || incomes.isError || expenses.isError;
  const newButton = (
    <Button size={desktop ? "md" : "lg"} block={!desktop} icon={<Plus size={18} aria-hidden="true" />} onClick={() => setSheet({ kind: "create", type: "expense" })}>
      Nova recorrência
    </Button>
  );

  return (
    <>
      <PageHeader
        back="/"
        title="Recorrentes"
        eyebrow={<span className="hidden lg:inline">Lançamentos automáticos</span>}
        actions={
          <>
            <MonthSwitcher month={month} year={year} onChange={setMonth} />
            {desktop && newButton}
          </>
        }
      />

      {loading ? (
        <LoadingCard label="Carregando recorrentes…" rows={4} />
      ) : failed ? (
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar as recorrentes.</p>
            <Button variant="secondary" onClick={ledger.retry}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      ) : !rules.length ? (
        <Card>
          <EmptyState
            title="Nenhuma recorrência"
            description="Aluguel, assinaturas e salário entram sozinhos todo mês depois de cadastrados."
            action={newButton}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4 lg:order-1">
            {desktop ? (
              <Card>
                <CardHeader title="Todas as recorrências" action={<span className="text-[13px] text-muted">Mensais, lançadas automaticamente</span>} />
                <RecurringTable rows={[...launched, ...upcoming].sort((a, b) => (a.date < b.date ? -1 : 1))} category={category} today={today} onOpen={open} />
              </Card>
            ) : (
              <>
                <OccurrenceSection title="Próximas" entries={upcoming} category={category} today={today} onOpen={open} />
                <OccurrenceSection title={`Já lançadas em ${name}`} entries={launched} category={category} today={today} onOpen={open} launched />
                {!occurrences.length && <p className="text-sm text-muted">Nenhuma recorrência em {name}.</p>}
              </>
            )}

            {paused.length > 0 && (
              <RuleList title={`Pausadas em ${name}`} rules={paused} onOpen={open} describe={() => "Não lança neste mês"} />
            )}
            {later.length > 0 && (
              <RuleList title="Começam depois" rules={later} onOpen={open} describe={({ item }) => `Começa em ${formatShortDate(isoToDateKey(item.startDate))} de ${isoToDateKey(item.startDate).slice(0, 4)}`} />
            )}
            {ended.length > 0 && (
              <div className="flex flex-col gap-2">
                <Button variant="link" className="self-start" aria-expanded={showEnded} onClick={() => setShowEnded((value) => !value)}>
                  Encerradas ({ended.length})
                </Button>
                {showEnded && (
                  <RuleList
                    title="Encerradas"
                    rules={ended}
                    onOpen={open}
                    describe={({ item }) => `Encerrada em ${formatShortDate(isoToDateKey(item.endDate!))} de ${isoToDateKey(item.endDate!).slice(0, 4)}`}
                  />
                )}
              </div>
            )}
            {!desktop && newButton}
          </div>

          <Card tone={desktop ? "default" : "hero"} className="-order-1 lg:sticky lg:top-8 lg:order-2">
            <span className={cx("text-sm", desktop ? "text-muted" : "text-on-hero-muted")}>
              {desktop ? "Despesas fixas do mês" : "Despesas fixas por mês"}
            </span>
            <Money value={summary.fixedExpense} size="lg" />
            {desktop ? (
              <>
                <span className="text-[13px] text-muted">Variáveis: {formatMoney(summary.variableExpense)}</span>
                <ProgressBar value={fixedShare * 100} label={`Fixas são ${Math.round(fixedShare * 100)}% do gasto`} />
                <span className="text-[13px] text-muted">Fixas representam {Math.round(fixedShare * 100)}% do gasto de {name}.</span>
              </>
            ) : (
              <span className="text-[13px] text-on-hero-muted">
                {Math.round(fixedShare * 100)}% das despesas de {name} · {activeExpenseCount} {activeExpenseCount === 1 ? "recorrência" : "recorrências"}
              </span>
            )}
          </Card>
        </div>
      )}

      <RecurringSheet
        state={sheet}
        onClose={() => setSheet(null)}
        monthAction={
          editingOccurrence
            ? {
                label: `Alterar só o valor de ${name}`,
                onClick: () => {
                  setSheet(null);
                  setVariation(editingOccurrence);
                },
              }
            : undefined
        }
      />
      <VariationSheet
        entry={variation}
        standardAmount={
          variation
            ? getFixedItemVersion(rules.find((r) => r.item.id === variation.id)?.item ?? { day: 1, startDate: "" }, year, month).amount
            : undefined
        }
        onClose={() => setVariation(null)}
      />
    </>
  );
}

function DateTile({ date, done }: { date: string; done?: boolean }) {
  const parsed = parseDateKey(date);
  if (done)
    return (
      <span aria-hidden="true" className="flex size-tap shrink-0 items-center justify-center rounded-tile bg-primary-tint text-primary">
        <Check size={20} />
      </span>
    );
  return (
    <span aria-hidden="true" className="flex size-tap shrink-0 flex-col items-center justify-center rounded-tile bg-surface-2 leading-none">
      <span className="font-num text-base font-semibold">{parsed.getDate()}</span>
      <span className="text-[10px] font-semibold uppercase text-muted">{shortMonthName(parsed.getMonth())}</span>
    </span>
  );
}

/** " · Vencida", " · A pagar", " · Paga" (contas a pagar), com a cor do status. */
function BillStatusText({ entry, standalone }: { entry: LedgerEntry; standalone?: boolean }) {
  const bill = entry.bill;
  if (!bill || bill.presumed) return null;
  return (
    <span className={bill.status === "vencida" ? "font-semibold text-expense" : bill.status === "paga" ? "text-primary" : undefined}>
      {standalone ? billLabel[bill.status] : ` · ${billLabel[bill.status].toLowerCase()}`}
    </span>
  );
}

function OccurrenceSection({
  title,
  entries,
  category,
  today,
  onOpen,
  launched,
}: {
  title: string;
  entries: LedgerEntry[];
  category: CategoryLookup;
  today: string;
  onOpen: (id: string) => void;
  launched?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <section aria-label={title}>
      <h2 className="pb-1 text-[15px] font-semibold">{title}</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.key} className="-mx-2 flex items-center gap-1">
            <button
              type="button"
              aria-label={`Editar ${entry.description}`}
              onClick={() => onOpen(entry.id)}
              className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {/* Conta a pagar: o ✓ do ladrilho ("lançada") confundiria com "paga"; mostra o dia. */}
              <DateTile date={entry.date} done={launched && (!entry.bill || entry.bill.presumed)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{entry.description}</span>
                <span className="block truncate text-[13px] text-muted">
                  {/* Conta a pagar: o dia já está no ladrilho; o texto é só o status (cabe em 360px). */}
                  {entry.bill && !entry.bill.presumed ? (
                    <BillStatusText entry={entry} standalone />
                  ) : launched ? (
                    `Lançada dia ${parseDateKey(entry.date).getDate()} · ${category(entry.categoryId)?.name ?? "Sem categoria"}`
                  ) : (
                    `Todo mês · ${formatRelativeDay(entry.date, today, { short: true }).toLowerCase()}`
                  )}
                </span>
              </span>
              <Money value={entry.amount} kind={entry.type} />
            </button>
            {entry.bill && !entry.bill.presumed && <BillCheckButton entry={entry} className="mr-2" />}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecurringTable({
  rows,
  category,
  today,
  onOpen,
}: {
  rows: LedgerEntry[];
  category: CategoryLookup;
  today: string;
  onOpen: (id: string) => void;
}) {
  const header = "py-3 text-left text-xs font-semibold uppercase tracking-[.04em] text-muted";
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={cx(header, "w-16")}>Dia</th>
          <th scope="col" className={header}>Descrição</th>
          <th scope="col" className={header}>Categoria</th>
          <th scope="col" className={cx(header, "text-right")}>Valor</th>
          <th scope="col" className="w-24"><span className="sr-only">Ações</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((entry) => (
          <tr key={entry.key} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-2" onClick={() => onOpen(entry.id)}>
            <td className="py-2.5">
              <span className={cx("flex size-tap items-center justify-center rounded-tile font-num text-base font-semibold", entry.upcoming ? "bg-surface-2" : "bg-primary-tint text-primary")}>
                {parseDateKey(entry.date).getDate()}
              </span>
            </td>
            <td className="py-2.5 pr-3">
              <span className="block text-[15px] font-semibold">{entry.description}</span>
              <span className="block text-[13px] text-muted">
                Todo mês · dia {entry.recurring?.day}
                {entry.recurring?.hasVariation ? " · valor ajustado neste mês" : ""}
                {!entry.upcoming && entry.date <= today && !entry.bill ? " · lançada" : ""}
                <BillStatusText entry={entry} />
              </span>
            </td>
            <td className="py-2.5 pr-3 text-[15px]">{category(entry.categoryId)?.name ?? "Sem categoria"}</td>
            <td className="py-2.5 text-right">
              <Money value={entry.amount} kind={entry.type} size="sm" />
            </td>
            <td className="py-2.5 text-right">
              <span className="inline-flex items-center gap-1">
              {entry.bill && !entry.bill.presumed && <BillCheckButton entry={entry} />}
              <button
                type="button"
                aria-label={`Editar ${entry.description}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(entry.id);
                }}
                className="inline-flex size-tap items-center justify-center rounded-full text-muted hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RuleList({
  title,
  rules,
  onOpen,
  describe,
}: {
  title: string;
  rules: Rule[];
  onOpen: (id: string) => void;
  describe: (rule: Rule) => string;
}) {
  return (
    <Card aria-label={title}>
      <CardHeader title={title} />
      <ul>
        {rules.map((rule) => (
          <li key={rule.item.id}>
            <button
              type="button"
              aria-label={`Editar ${rule.item.description}`}
              onClick={() => onOpen(rule.item.id)}
              className="-mx-2 flex min-h-14 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{rule.item.description}</span>
                <span className="block text-[13px] text-muted">{describe(rule)}</span>
              </span>
              <Money value={rule.item.amount} kind={rule.type} size="sm" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

