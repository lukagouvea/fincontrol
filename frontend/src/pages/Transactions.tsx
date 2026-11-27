import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, CreditCard, ListFilter, Plus, Repeat, Search, Tag, Trash2, X } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useCards } from "../hooks/useCards";
import { useBatchTransactions } from "../hooks/useTransactions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedMonth } from "../app/MonthContext";
import { usePendingDeletes } from "../app/PendingDeletes";
import { useTransactionEditor } from "../app/TransactionEditor";
import { useLedgerMonths, todayKey } from "../features/useLedger";
import { makeCategoryLookup, type CategoryLookup } from "../features/categories";
import { makeCardLookup, type CardLookup } from "../features/cards/cardStyle";
import type { LedgerEntry } from "../features/ledger";
import { TransactionDetail } from "../features/transactions/TransactionDetail";
import { VariationSheet } from "../features/transactions/VariationSheet";
import { useDeleteEntry } from "../features/transactions/useEntryActions";
import { FiltersSheet } from "../features/transactions/FiltersSheet";
import { applyFilters, EMPTY_FILTERS, filterChips, hasFilters, periodRange, type TransactionFilters } from "../features/transactions/filters";
import { cx } from "../lib/cx";
import { formatRelativeDay, monthLabel, monthNames } from "../lib/dates";
import { formatMoney, sumMoney } from "../lib/money";
import { Button, ButtonLink, IconButton } from "../ui/Button";
import { Card } from "../ui/Card";
import { Chip, Badge } from "../ui/Chip";
import { ConfirmSheet } from "../ui/ConfirmSheet";
import { EmptyState } from "../ui/EmptyState";
import { inputClass } from "../ui/Field";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { PayChip } from "../ui/PayChip";
import { Sheet } from "../ui/Sheet";
import { LoadingCard } from "../ui/Skeleton";
import { CategoryIcon } from "../ui/CategoryIcon";
import { useToast } from "../ui/Toast";

type TypeFilter = "todas" | "despesa" | "receita";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function entryTags(entry: LedgerEntry) {
  const tags: string[] = [];
  if (entry.source === "recurring") tags.push("Recorrente");
  if (entry.installment) tags.push(`Parcela ${entry.installment.current} de ${entry.installment.total}`);
  return tags;
}

/** Só transações gravadas entram no lote; recorrentes projetadas se editam pela recorrência. */
const selectable = (entry: LedgerEntry) => entry.source === "transaction";

export function Transactions() {
  const { month, year, setMonth } = useSelectedMonth();
  const [params, setParams] = useSearchParams();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const cardsQuery = useCards();
  const card = useMemo(() => makeCardLookup(cardsQuery.data), [cardsQuery.data]);
  const { hidden, scheduleDelete } = usePendingDeletes();
  const editor = useTransactionEditor();
  const deleteEntry = useDeleteEntry();
  const batch = useBatchTransactions();
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [variationEntry, setVariationEntry] = useState<LedgerEntry | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(EMPTY_FILTERS);
  const [previewFilters, setPreviewFilters] = useState<TransactionFilters | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [batchSheet, setBatchSheet] = useState<"categoria" | "pagamento" | "excluir" | null>(null);
  const today = todayKey();

  const range = periodRange(filters, month, year);
  const previewRange = previewFilters ? periodRange(previewFilters, month, year) : null;
  // Carrega os meses do filtro aplicado e do rascunho (para contar resultados).
  const months = useMemo(() => {
    const all = [...range.months, ...(previewRange?.months ?? [])];
    return all.filter((m, i) => all.findIndex((n) => n.month === m.month && n.year === m.year) === i);
  }, [JSON.stringify(range.months), JSON.stringify(previewRange?.months)]); // eslint-disable-line react-hooks/exhaustive-deps
  const ledger = useLedgerMonths(months);

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

  const baseFilter = (entries: LedgerEntry[]) => {
    const term = normalize(query.trim());
    return entries.filter((entry) => {
      if (hidden.has(entry.key)) return false;
      if (typeFilter === "despesa" && entry.type !== "expense") return false;
      if (typeFilter === "receita" && entry.type !== "income") return false;
      if (!term) return true;
      return normalize(entry.description).includes(term) || normalize(category(entry.categoryId)?.name ?? "").includes(term);
    });
  };

  const visible = useMemo(
    () => applyFilters(baseFilter(ledger.entries), filters, range),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger.entries, hidden, typeFilter, query, category, filters, range.from, range.to],
  );

  const countFor = (draft: TransactionFilters) => {
    if (ledger.isLoading) return null;
    const draftRange = periodRange(draft, month, year);
    const loaded = draftRange.months.every((m) => months.some((n) => n.month === m.month && n.year === m.year));
    return loaded ? applyFilters(baseFilter(ledger.entries), draft, draftRange).length : null;
  };

  const selected = selectedKey ? ledger.entries.find((entry) => entry.key === selectedKey && !hidden.has(entry.key)) : undefined;

  useEffect(() => {
    if (selectedKey && !ledger.isLoading && !selected) updateParams({ t: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, selected, ledger.isLoading]);

  // Seleção some quando as linhas somem (filtro, exclusão).
  useEffect(() => {
    if (!picked.size) return;
    const keys = new Set(visible.map((entry) => entry.key));
    const next = new Set([...picked].filter((key) => keys.has(key)));
    if (next.size !== picked.size) setPicked(next);
  }, [visible, picked]);

  const select = (entry: LedgerEntry) => updateParams({ t: entry.key });
  const closeDetail = () => updateParams({ t: null });
  const togglePick = (entry: LedgerEntry) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(entry.key)) next.delete(entry.key);
      else next.add(entry.key);
      return next;
    });
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };

  const pickedEntries = visible.filter((entry) => picked.has(entry.key));
  const pickable = visible.filter(selectable);
  const pickedTotal = sumMoney(pickedEntries.map((entry) => (entry.type === "income" ? -entry.amount : entry.amount)));
  const pickedTypes = [...new Set(pickedEntries.map((entry) => entry.type))];
  const ids = pickedEntries.map((entry) => entry.id);

  const changeField = async (field: "categoryId" | "cardId", value: string | null, label: string) => {
    setBatchSheet(null);
    // Para desfazer: volta cada transação ao valor anterior (agrupado por valor).
    const previous = new Map<string | null, string[]>();
    for (const entry of pickedEntries) {
      const old = field === "categoryId" ? entry.categoryId : entry.cardId;
      previous.set(old, [...(previous.get(old) ?? []), entry.id]);
    }
    try {
      await batch.mutateAsync({ action: "update", ids, data: { [field]: value } });
      const count = ids.length;
      stopSelecting();
      showToast({
        message: `${count} ${count === 1 ? "transação movida" : "transações movidas"} para ${label}`,
        actionLabel: "Desfazer",
        onAction: () => {
          for (const [old, group] of previous) {
            if (field === "categoryId" && !old) continue;
            batch.mutate({ action: "update", ids: group, data: { [field]: old } });
          }
        },
      });
    } catch {
      showToast({ message: "Não foi possível alterar as transações." });
    }
  };

  const deletePicked = () => {
    setBatchSheet(null);
    const groups = new Set(pickedEntries.map((entry) => entry.installment?.groupId).filter(Boolean));
    const keys = [
      ...pickedEntries.map((entry) => entry.key),
      ...ledger.entries.filter((entry) => entry.installment?.groupId && groups.has(entry.installment.groupId)).map((entry) => entry.key),
    ];
    const count = pickedEntries.length;
    const deleteIds = ids;
    stopSelecting();
    scheduleDelete({
      keys,
      message: `${count} ${count === 1 ? "transação excluída" : "transações excluídas"}`,
      commit: () => batch.mutateAsync({ action: "delete", ids: deleteIds }),
    });
  };

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
  const filtered = !!query.trim() || typeFilter !== "todas" || hasFilters(filters);
  const chips = filterChips(filters, { card: (id) => card(id)?.name, category: (id) => category(id)?.name }, month);
  const activeCards = (cardsQuery.data ?? []).filter((item) => !item.archived);
  const filterCategories = (categoriesQuery.data ?? []).filter((item) => item.active !== false && (typeFilter === "todas" || item.type === (typeFilter === "despesa" ? "expense" : "income")));
  const visibleTotal = sumMoney(visible.map((entry) => (entry.type === "income" ? -entry.amount : entry.amount)));

  const header = selecting && !desktop ? (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-num text-[28px] font-semibold leading-tight lg:text-[32px]">
          {picked.size} {picked.size === 1 ? "selecionada" : "selecionadas"}
        </h1>
        <p className="text-[13px] text-muted">{picked.size ? `Somam ${formatMoney(Math.abs(pickedTotal))}` : "Toque nas transações para selecionar"}</p>
      </div>
      <Button variant="link" onClick={stopSelecting}>
        Cancelar
      </Button>
    </header>
  ) : (
    <PageHeader
      title="Transações"
      eyebrow={<span className="hidden lg:inline">{monthLabel(month, year)}</span>}
      actions={
        selecting ? (
          <Button variant="secondary" onClick={stopSelecting}>
            Concluir
          </Button>
        ) : (
        <>
          {desktop && <MonthSwitcher month={month} year={year} onChange={setMonth} />}
          <Button variant="secondary" onClick={() => setSelecting(true)} disabled={!pickable.length}>
            Selecionar
          </Button>
          {desktop && (
            <ButtonLink to="/importar" variant="secondary">
              Importar extrato
            </ButtonLink>
          )}
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
        )
      }
    />
  );

  const batchActions = (
    <>
      <BatchAction icon={<Tag size={20} />} label="Categoria" onClick={() => setBatchSheet("categoria")} disabled={!picked.size || pickedTypes.length > 1} />
      <BatchAction icon={<CreditCard size={20} />} label="Pagamento" onClick={() => setBatchSheet("pagamento")} disabled={!picked.size || pickedTypes.includes("income")} />
      <BatchAction icon={<Trash2 size={20} />} label="Excluir" danger onClick={() => setBatchSheet("excluir")} disabled={!picked.size} />
    </>
  );

  return (
    <>
      {header}
      {/* Celular: o cabeçalho fica só com Selecionar e "+" (Transacoes.html); o mês
          vai numa linha própria, como em Orçamento. Em 360px os três não cabiam juntos. */}
      {!desktop && !selecting && (
        <div className="-mt-1">
          <MonthSwitcher month={month} year={year} onChange={setMonth} />
        </div>
      )}

      <div className={cx("grid grid-cols-1 items-start gap-4 lg:gap-6", !selecting && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className={cx("flex min-w-0 flex-col gap-4", desktop && "rounded-card border border-border bg-surface p-5")}>
          {selecting && desktop && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hero px-4 py-3 text-on-hero">
              <span className="text-[15px] font-semibold">
                {picked.size} {picked.size === 1 ? "selecionada" : "selecionadas"}
                {picked.size > 0 && <span className="font-normal text-on-hero-muted"> · {formatMoney(Math.abs(pickedTotal))}</span>}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={!picked.size || pickedTypes.length > 1} onClick={() => setBatchSheet("categoria")}>
                  Mudar categoria
                </Button>
                <Button variant="secondary" disabled={!picked.size || pickedTypes.includes("income")} onClick={() => setBatchSheet("pagamento")}>
                  Mudar pagamento
                </Button>
                <Button variant="secondary" className="!text-expense" disabled={!picked.size} onClick={() => setBatchSheet("excluir")}>
                  Excluir
                </Button>
                <Button variant="ghost" className="!text-on-hero" onClick={stopSelecting}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!selecting && (
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
                <IconButton label={hasFilters(filters) ? `Filtros (${chips.length})` : "Filtros"} onClick={() => setFiltersOpen(true)} className={cx(hasFilters(filters) && "!border-primary !bg-primary-tint !text-primary")}>
                  <ListFilter size={20} aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          )}

          {!selecting && chips.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setFilters(chip.remove(filters))}
                    aria-label={`Remover filtro ${chip.label}`}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-primary-tint px-3 text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    {chip.label}
                    <X size={14} aria-hidden="true" />
                  </button>
                ))}
                <Button variant="link" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Limpar tudo
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
                <span className="text-[15px] text-muted">
                  {visible.length} {visible.length === 1 ? "transação" : "transações"}
                </span>
                <Money value={Math.abs(visibleTotal)} kind={visibleTotal >= 0 ? "expense" : "income"} size="lg" />
              </div>
            </div>
          )}

          {selecting && pickable.length > 0 && (
            <label className="flex min-h-tap cursor-pointer items-center gap-3 text-[15px] font-semibold">
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={picked.size === pickable.length}
                onChange={(event) => setPicked(event.target.checked ? new Set(pickable.map((entry) => entry.key)) : new Set())}
              />
              Selecionar todas as {pickable.length}
            </label>
          )}

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
              description={filtered ? "Tente outro termo ou limpe os filtros." : "Registre um gasto ou uma receita para começar a acompanhar o mês."}
              action={
                filtered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setFilters(EMPTY_FILTERS);
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
            <TransactionTable
              entries={visible}
              category={category}
              card={card}
              today={today}
              selectedKey={selected?.key}
              onSelect={selecting ? togglePick : select}
              selection={selecting ? picked : undefined}
            />
          ) : (
            <TransactionList entries={visible} category={category} card={card} today={today} onSelect={selecting ? togglePick : select} selection={selecting ? picked : undefined} />
          )}
        </div>

        {desktop && !selecting && (
          <Card className="sticky top-8">
            {detail ?? <p className="py-6 text-center text-sm text-muted">Selecione uma transação para ver os detalhes.</p>}
          </Card>
        )}
      </div>

      {selecting && !desktop && (
        <nav aria-label="Ações da seleção" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-surface px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          {batchActions}
        </nav>
      )}

      {!desktop && (
        <Sheet open={!!selected && !selecting} onClose={closeDetail} title="Detalhes" mobile="full">
          {detail ?? <span />}
        </Sheet>
      )}
      <VariationSheet entry={variationEntry} onClose={() => setVariationEntry(null)} />
      <FiltersSheet
        open={filtersOpen}
        value={filters}
        cards={activeCards}
        categories={filterCategories}
        count={countFor}
        onPreview={setPreviewFilters}
        onApply={(next) => {
          setFilters(next);
          setPreviewFilters(null);
          setFiltersOpen(false);
        }}
        onClose={() => {
          setPreviewFilters(null);
          setFiltersOpen(false);
        }}
      />
      <ChoiceSheet
        open={batchSheet === "categoria"}
        title="Mudar categoria"
        description={`${picked.size} ${picked.size === 1 ? "transação" : "transações"} vão para a categoria escolhida.`}
        options={(categoriesQuery.data ?? [])
          .filter((item) => item.active !== false && item.type === (pickedTypes[0] ?? "expense"))
          .map((item) => ({ value: item.id, label: item.name, leading: <CategoryIcon category={item} /> }))}
        onClose={() => setBatchSheet(null)}
        onChoose={(value, label) => changeField("categoryId", value, label)}
      />
      <ChoiceSheet
        open={batchSheet === "pagamento"}
        title="Mudar pagamento"
        description="Compras parceladas mudam por inteiro."
        options={[
          { value: "avista", label: "À vista", hint: "Pix, dinheiro ou débito" },
          ...activeCards.map((item) => ({ value: item.id, label: item.name, hint: `•••• ${item.last4}` })),
        ]}
        onClose={() => setBatchSheet(null)}
        onChoose={(value, label) => changeField("cardId", value === "avista" ? null : value, label)}
      />
      <ConfirmSheet
        open={batchSheet === "excluir"}
        onClose={() => setBatchSheet(null)}
        title={`Excluir ${picked.size} ${picked.size === 1 ? "transação" : "transações"}?`}
        description={
          pickedEntries.some((entry) => entry.installment)
            ? "Parcelas selecionadas excluem a compra parcelada inteira. Você pode desfazer logo em seguida."
            : "Elas saem da lista e dos totais. Você pode desfazer logo em seguida."
        }
        confirmLabel="Excluir"
        onConfirm={deletePicked}
      />
    </>
  );
}

function BatchAction({ icon, label, onClick, disabled, danger }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[13px] font-semibold disabled:opacity-40",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
        danger ? "text-expense" : "text-ink",
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

function ChoiceSheet({
  open,
  title,
  description,
  options,
  onClose,
  onChoose,
}: {
  open: boolean;
  title: string;
  description: string;
  options: Array<{ value: string; label: string; hint?: string; leading?: React.ReactNode }>;
  onClose: () => void;
  onChoose: (value: string, label: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}>
      <ul>
        {options.map((option) => (
          <li key={option.value}>
            <button
              type="button"
              onClick={() => onChoose(option.value, option.label)}
              className="-mx-2 flex min-h-14 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {option.leading}
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{option.label}</span>
                {option.hint && <span className="block text-[13px] text-muted">{option.hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function SelectBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx("flex size-6 shrink-0 items-center justify-center rounded-md border-2", checked ? "border-primary bg-primary text-on-primary" : "border-border-strong bg-surface")}
    >
      {checked && <Check size={16} strokeWidth={3} />}
    </span>
  );
}

function TransactionList({
  entries,
  category,
  card,
  today,
  onSelect,
  selection,
}: {
  entries: LedgerEntry[];
  category: CategoryLookup;
  card: CardLookup;
  today: string;
  onSelect: (entry: LedgerEntry) => void;
  selection?: Set<string>;
}) {
  const groups: Array<{ date: string; items: LedgerEntry[] }> = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last?.date === entry.date) last.items.push(entry);
    else groups.push({ date: entry.date, items: [entry] });
  }
  return (
    <div className={cx("flex flex-col gap-1", selection && "pb-24")}>
      {groups.map((group) => (
        <section key={group.date} aria-label={formatRelativeDay(group.date, today)}>
          <h2 className="pb-1 pt-3 text-[13px] font-semibold text-muted">{formatRelativeDay(group.date, today)}</h2>
          <ul>
            {group.items.map((entry) => {
              const cat = category(entry.categoryId);
              const payment = entry.type === "expense" ? card(entry.cardId)?.name ?? "À vista" : null;
              const subtitle = [cat?.name ?? "Sem categoria", payment, ...entryTags(entry)].filter(Boolean).join(" · ");
              const checked = !!selection?.has(entry.key);
              const disabled = !!selection && !selectable(entry);
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => !disabled && onSelect(entry)}
                    aria-pressed={selection ? checked : undefined}
                    aria-disabled={disabled || undefined}
                    className={cx(
                      "-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
                      checked ? "bg-primary-tint" : "hover:bg-surface-2",
                      disabled && "opacity-50",
                    )}
                  >
                    {selection && <SelectBox checked={checked} />}
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
  selection,
}: {
  entries: LedgerEntry[];
  category: CategoryLookup;
  card: CardLookup;
  today: string;
  selectedKey?: string;
  onSelect: (entry: LedgerEntry) => void;
  selection?: Set<string>;
}) {
  const header = "py-3 text-left text-xs font-semibold uppercase tracking-[.04em] text-muted";
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-border">
          {selection && <th scope="col" className="w-10"><span className="sr-only">Selecionar</span></th>}
          <th scope="col" className={header}>Descrição</th>
          <th scope="col" className={header}>Categoria</th>
          <th scope="col" className={header}>Pago com</th>
          <th scope="col" className={cx(header, "text-right")}>Valor</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          const active = selection ? selection.has(entry.key) : entry.key === selectedKey;
          const disabled = !!selection && !selectable(entry);
          const meta = [formatRelativeDay(entry.date, today, { short: true }), ...entryTags(entry)].join(" · ");
          return (
            <tr
              key={entry.key}
              aria-selected={active}
              onClick={() => !disabled && onSelect(entry)}
              className={cx("cursor-pointer border-b border-border last:border-b-0", active ? (selection ? "bg-primary-tint" : "bg-surface-2") : "hover:bg-surface-2", disabled && "cursor-default opacity-50")}
            >
              {selection && (
                <td className="py-3 pl-2">
                  <SelectBox checked={active} />
                </td>
              )}
              <td className="py-3 pl-2 pr-3">
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selection ? active : undefined}
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
