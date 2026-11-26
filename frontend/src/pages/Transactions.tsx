import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Repeat, Search } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useCards } from "../hooks/useCards";
import { makeCardLookup, type CardLookup } from "../features/cards/cardStyle";
import { PayChip } from "../ui/PayChip";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedMonth } from "../app/MonthContext";
import { usePendingDeletes } from "../app/PendingDeletes";
import { useTransactionEditor } from "../app/TransactionEditor";
import { useMonthLedger, todayKey } from "../features/useLedger";
import { makeCategoryLookup, type CategoryLookup } from "../features/categories";
import type { LedgerEntry } from "../features/ledger";
import { TransactionDetail } from "../features/transactions/TransactionDetail";
import { VariationSheet } from "../features/transactions/VariationSheet";
import { useDeleteEntry } from "../features/transactions/useEntryActions";
import { cx } from "../lib/cx";
import { formatRelativeDay, monthLabel, monthNames } from "../lib/dates";
import { Button, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip, Badge } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { inputClass } from "../ui/Field";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { Sheet } from "../ui/Sheet";
import { LoadingCard } from "../ui/Skeleton";
import { CategoryIcon } from "../ui/CategoryIcon";

type TypeFilter = "todas" | "despesa" | "receita";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function entryTags(entry: LedgerEntry) {
  const tags: string[] = [];
  if (entry.source === "recurring") tags.push("Recorrente");
  if (entry.installment) tags.push(`Parcela ${entry.installment.current} de ${entry.installment.total}`);
  return tags;
}

export function Transactions() {
  const { month, year, setMonth } = useSelectedMonth();
  const [params, setParams] = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const ledger = useMonthLedger(month, year);
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const cardsQuery = useCards();
  const card = useMemo(() => makeCardLookup(cardsQuery.data), [cardsQuery.data]);
  const { hidden } = usePendingDeletes();
  const editor = useTransactionEditor();
  const deleteEntry = useDeleteEntry();
  const [query, setQuery] = useState("");
  const [variationEntry, setVariationEntry] = useState<LedgerEntry | null>(null);
  const today = todayKey();

  const typeFilter: TypeFilter = params.get("tipo") === "receita" ? "receita" : params.get("tipo") === "despesa" ? "despesa" : "todas";
  const selectedKey = params.get("t");

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return ledger.entries.filter((entry) => {
      if (hidden.has(entry.key)) return false;
      if (typeFilter === "despesa" && entry.type !== "expense") return false;
      if (typeFilter === "receita" && entry.type !== "income") return false;
      if (!term) return true;
      return (
        normalize(entry.description).includes(term) ||
        normalize(category(entry.categoryId)?.name ?? "").includes(term)
      );
    });
  }, [ledger.entries, hidden, typeFilter, query, category]);

  const selected = selectedKey ? ledger.entries.find((entry) => entry.key === selectedKey && !hidden.has(entry.key)) : undefined;

  // Linha selecionada sumiu (excluída ou outro mês): fecha o detalhe.
  useEffect(() => {
    if (selectedKey && !ledger.isLoading && !selected) updateParams({ t: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, selected, ledger.isLoading]);

  const select = (entry: LedgerEntry) => updateParams({ t: entry.key });
  const closeDetail = () => updateParams({ t: null });

  const detail = selected ? (
    <TransactionDetail
      entry={selected}
      category={category(selected.categoryId)}
      card={card(selected.cardId)}
      layout={desktop ? "panel" : "screen"}
      onEdit={() => editor.edit(selected)}
      onDelete={() => {
        deleteEntry(selected, ledger.entries);
        closeDetail();
      }}
      onChangeMonthValue={() => setVariationEntry(selected)}
    />
  ) : null;

  const monthName = monthNames[month].toLowerCase();
  const filtered = query.trim() || typeFilter !== "todas";

  return (
    <>
      <PageHeader
        title="Transações"
        eyebrow={<span className="hidden lg:inline">{monthLabel(month, year)}</span>}
        actions={
          <>
            <MonthSwitcher month={month} year={year} onChange={setMonth} />
            {desktop ? (
              <Button size="md" icon={<Plus size={18} aria-hidden="true" />} onClick={() => editor.create()}>
                Nova transação
              </Button>
            ) : (
              <IconButton label="Nova transação" onClick={() => editor.create()} className="!border-primary !bg-primary !text-on-primary">
                <Plus size={22} aria-hidden="true" />
              </IconButton>
            )}
          </>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className={cx("flex min-w-0 flex-col gap-4", desktop && "rounded-card border border-border bg-surface p-5")}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:flex-1">
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                aria-label="Buscar transações"
                placeholder="Buscar por nome ou categoria"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={inputClass(false, "h-12 pl-11")}
              />
            </div>
            <div role="group" aria-label="Tipo" className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
              {(
                [
                  ["todas", "Todas"],
                  ["despesa", "Despesas"],
                  ["receita", "Receitas"],
                ] as const
              ).map(([value, label]) => (
                <Chip key={value} selected={typeFilter === value} onClick={() => updateParams({ tipo: value === "todas" ? null : value })}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          {ledger.isLoading ? (
            <LoadingCard label="Carregando transações…" rows={5} />
          ) : ledger.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-expense-tint p-4 text-expense">
              <p className="text-[15px] font-semibold">Não foi possível carregar as transações de {monthName}.</p>
              <Button variant="secondary" onClick={ledger.retry}>
                Tentar novamente
              </Button>
            </div>
          ) : !visible.length ? (
            <EmptyState
              title={filtered ? "Nada encontrado" : `Nenhuma transação em ${monthName}`}
              description={
                filtered
                  ? "Tente outro termo ou limpe os filtros."
                  : "Registre um gasto ou uma receita para começar a acompanhar o mês."
              }
              action={
                filtered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      updateParams({ tipo: null });
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <Button size="lg" icon={<Plus size={18} aria-hidden="true" />} onClick={() => editor.create()}>
                    Adicionar transação
                  </Button>
                )
              }
            />
          ) : desktop ? (
            <TransactionTable entries={visible} category={category} card={card} today={today} selectedKey={selected?.key} onSelect={select} />
          ) : (
            <TransactionList entries={visible} category={category} card={card} today={today} onSelect={select} />
          )}
        </div>

        {desktop && (
          <Card className="sticky top-8">
            {detail ?? <p className="py-6 text-center text-sm text-muted">Selecione uma transação para ver os detalhes.</p>}
          </Card>
        )}
      </div>

      {!desktop && (
        <Sheet open={!!selected} onClose={closeDetail} title="Detalhes" mobile="full">
          {detail ?? <span />}
        </Sheet>
      )}
      <VariationSheet entry={variationEntry} onClose={() => setVariationEntry(null)} />
    </>
  );
}

function TransactionList({
  entries,
  category,
  card,
  today,
  onSelect,
}: {
  entries: LedgerEntry[];
  category: CategoryLookup;
  card: CardLookup;
  today: string;
  onSelect: (entry: LedgerEntry) => void;
}) {
  const groups: Array<{ date: string; items: LedgerEntry[] }> = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last?.date === entry.date) last.items.push(entry);
    else groups.push({ date: entry.date, items: [entry] });
  }
  return (
    <div className="flex flex-col gap-1">
      {groups.map((group) => (
        <section key={group.date} aria-label={formatRelativeDay(group.date, today)}>
          <h2 className="pb-1 pt-3 text-[13px] font-semibold text-muted">{formatRelativeDay(group.date, today)}</h2>
          <ul>
            {group.items.map((entry) => {
              const cat = category(entry.categoryId);
              const payment = entry.type === "expense" ? card(entry.cardId)?.name ?? "À vista" : null;
              const subtitle = [cat?.name ?? "Sem categoria", payment, ...entryTags(entry)].filter(Boolean).join(" · ");
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <CategoryIcon category={cat} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                        {entry.description}
                        {entry.source === "recurring" && <Repeat size={14} className="shrink-0 text-muted" aria-label="Recorrente" />}
                      </span>
                      <span className="truncate text-[13px] text-muted">{subtitle}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <Money value={entry.amount} kind={entry.type} />
                      {entry.upcoming && <span className="text-xs text-muted">Previsto</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TransactionTable({
  entries,
  category,
  card,
  today,
  selectedKey,
  onSelect,
}: {
  entries: LedgerEntry[];
  category: CategoryLookup;
  card: CardLookup;
  today: string;
  selectedKey?: string;
  onSelect: (entry: LedgerEntry) => void;
}) {
  const header = "py-3 text-left text-xs font-semibold uppercase tracking-[.04em] text-muted";
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={header}>Descrição</th>
          <th scope="col" className={header}>Categoria</th>
          <th scope="col" className={header}>Pago com</th>
          <th scope="col" className={cx(header, "text-right")}>Valor</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const selected = entry.key === selectedKey;
          const meta = [formatRelativeDay(entry.date, today, { short: true }), ...entryTags(entry)].join(" · ");
          return (
            <tr
              key={entry.key}
              aria-selected={selected}
              onClick={() => onSelect(entry)}
              className={cx("cursor-pointer border-b border-border last:border-b-0", selected ? "bg-surface-2" : "hover:bg-surface-2")}
            >
              <td className="py-3 pl-2 pr-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(entry);
                  }}
                  className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="block text-[15px] font-semibold">{entry.description}</span>
                  <span className="block text-[13px] text-muted">{meta}</span>
                </button>
              </td>
              <td className="py-3 pr-3 text-[15px]">
                {category(entry.categoryId)?.name ?? "Sem categoria"}
                {entry.upcoming && (
                  <Badge tone="neutral" className="ml-2">
                    Previsto
                  </Badge>
                )}
              </td>
              <td className="py-3 pr-3">{entry.type === "expense" ? <PayChip card={card(entry.cardId)} /> : <span className="text-muted">—</span>}</td>
              <td className="py-3 pr-2 text-right">
                <Money value={entry.amount} kind={entry.type} size="sm" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
