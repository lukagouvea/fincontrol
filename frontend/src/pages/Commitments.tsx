import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plus, Repeat } from "lucide-react";
import { useActiveInstallments, useCards } from "../hooks/useCards";
import { useFixedExpenses } from "../hooks/useFixedTransactions";
import { useDeleteTransaction } from "../hooks/useTransactions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useTransactionEditor } from "../app/TransactionEditor";
import { usePendingDeletes } from "../app/PendingDeletes";
import { makeCardLookup } from "../features/cards/cardStyle";
import { todayKey } from "../features/useLedger";
import type { Card, Transaction } from "../types/FinanceTypes";
import { getFixedItemVersion, isItemActiveInMonth } from "../utils/financeUtils";
import { fromMonthIndex, isoToDateKey, monthIndex, monthNames, formatShortDate, shortMonthName } from "../lib/dates";
import { formatMoney, fromCents, sumMoney, toCents } from "../lib/money";
import { cx } from "../lib/cx";
import { Button } from "../ui/Button";
import { Card as Panel, CardHeader } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { PayChip } from "../ui/PayChip";
import { ProgressBar } from "../ui/ProgressBar";
import { Sheet } from "../ui/Sheet";
import { ConfirmSheet } from "../ui/ConfirmSheet";
import { LoadingCard } from "../ui/Skeleton";
import { IconTile } from "../ui/ListRow";

type Parcel = { id: string; number: number; date: string; amount: number };

export type Purchase = {
  groupId: string;
  description: string;
  cardId: string | null;
  total: number;
  count: number;
  /** Parcela do mês atual (ou a última já lançada). */
  current: number;
  perMonth: number;
  remaining: number;
  remainingCount: number;
  parcels: Parcel[];
};

type ApiInstallment = Transaction & {
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentInfo?: { current: number; total: number } | null;
};

/** Agrupa as parcelas por compra e calcula o que falta a partir do mês atual. */
export function groupPurchases(transactions: Transaction[], today: string): Purchase[] {
  const currentMonth = today.slice(0, 7);
  const groups = new Map<string, ApiInstallment[]>();
  for (const t of transactions as ApiInstallment[]) {
    if (!t.installmentGroupId) continue;
    groups.set(t.installmentGroupId, [...(groups.get(t.installmentGroupId) ?? []), t]);
  }
  return [...groups.entries()]
    .map(([groupId, items]) => {
      const parcels = items
        .map((t) => ({ id: t.id, number: t.installmentNumber ?? t.installmentInfo?.current ?? 0, date: isoToDateKey(t.date), amount: Number(t.amount) }))
        .sort((a, b) => a.number - b.number);
      const future = parcels.filter((p) => p.date.slice(0, 7) > currentMonth);
      const thisMonth = parcels.find((p) => p.date.slice(0, 7) === currentMonth);
      const started = parcels.filter((p) => p.date.slice(0, 7) <= currentMonth);
      return {
        groupId,
        description: items[0].description,
        cardId: items[0].cardId ?? null,
        total: sumMoney(parcels.map((p) => p.amount)),
        count: items[0].installmentInfo?.total ?? parcels.length,
        current: thisMonth?.number ?? started[started.length - 1]?.number ?? 0,
        perMonth: (thisMonth ?? future[0] ?? parcels[parcels.length - 1]).amount,
        remaining: sumMoney(future.map((p) => p.amount)),
        remainingCount: future.length,
        parcels,
      };
    })
    .filter((purchase) => purchase.remainingCount > 0 || purchase.parcels.some((p) => p.date.slice(0, 7) === currentMonth))
    .sort((a, b) => b.remaining - a.remaining);
}

const MONTHS_AHEAD = 8;

export function Commitments() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const installments = useActiveInstallments();
  const cardsQuery = useCards();
  const fixedExpenses = useFixedExpenses();
  const editor = useTransactionEditor();
  const { hidden } = usePendingDeletes();
  const card = useMemo(() => makeCardLookup(cardsQuery.data), [cardsQuery.data]);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const today = todayKey();
  const now = new Date();
  const start = monthIndex(now.getFullYear(), now.getMonth());

  const purchases = useMemo(
    () => groupPurchases(installments.data ?? [], today).filter((p) => !hidden.has(`group:${p.groupId}`)),
    [installments.data, today, hidden],
  );
  const months = Array.from({ length: MONTHS_AHEAD }, (_, i) => {
    const { year, month } = fromMonthIndex(start + i);
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const cents = purchases.flatMap((p) => p.parcels).filter((p) => p.date.startsWith(key)).reduce((sum, p) => sum + toCents(p.amount), 0);
    return { key, month, value: fromCents(cents) };
  });
  const totalAhead = sumMoney(purchases.map((p) => p.remaining));
  const lastMonth = purchases.flatMap((p) => p.parcels).reduce((max, p) => (p.date > max ? p.date : max), "");
  const fixedMonthly = sumMoney(
    (fixedExpenses.data ?? [])
      .filter((item) => isItemActiveInMonth(item, new Date(now.getFullYear(), now.getMonth(), 1)))
      .map((item) => getFixedItemVersion(item, now.getFullYear(), now.getMonth()).amount),
  );
  const max = Math.max(1, ...months.map((m) => m.value));
  const thisMonth = months[0];

  const newPurchase = (
    <Button size={desktop ? "md" : "lg"} block={!desktop} icon={<Plus size={18} aria-hidden="true" />} onClick={() => editor.create()}>
      Nova compra parcelada
    </Button>
  );

  return (
    <>
      <PageHeader back="/cartoes" title="Compromissos" eyebrow={<span className="hidden lg:inline">Parcelas e fixas dos próximos meses</span>} actions={desktop ? newPurchase : undefined} />
      {installments.isPending ? (
        <LoadingCard label="Carregando compromissos…" rows={4} />
      ) : installments.isError ? (
        <Panel>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar as parcelas.</p>
            <Button variant="secondary" onClick={() => installments.refetch()}>
              Tentar novamente
            </Button>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
          <Panel>
            <span className="text-sm text-muted">Ainda a pagar em parcelas</span>
            <Money value={totalAhead} size="lg" />
            <span className="text-[13px] text-muted">
              {purchases.length
                ? `${lastMonth ? `até ${shortMonthName(Number(lastMonth.slice(5, 7)) - 1)}/${lastMonth.slice(2, 4)}` : ""} · ${purchases.length} ${purchases.length === 1 ? "compra parcelada" : "compras parceladas"}`
                : "Nenhuma compra parcelada em andamento"}
            </span>
            <figure aria-label="Parcelas por mês" className="mt-2 flex flex-col gap-1">
              <div className="flex h-[130px] items-end gap-2">
                {months.map((m, i) => (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" role="img" aria-label={`${monthNames[m.month]}: ${formatMoney(m.value)}`}>
                    <span aria-hidden="true" className="font-num text-[11px] font-semibold text-ink-2">
                      {m.value ? Math.round(m.value).toLocaleString("pt-BR") : "—"}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cx("w-full max-w-[36px] rounded-t-lg", i === 0 ? "bg-primary" : "bg-chart-4")}
                      style={{ height: `${m.value ? Math.max(4, (m.value / max) * 100) : 0}%` }}
                    />
                  </div>
                ))}
              </div>
              <div aria-hidden="true" className="flex gap-2 text-[12px] text-muted">
                {months.map((m, i) => (
                  <span key={m.key} className={cx("flex-1 text-center", i === 0 && "font-semibold text-ink")}>
                    {shortMonthName(m.month).replace(/^./, (c) => c.toUpperCase())}
                  </span>
                ))}
              </div>
            </figure>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel>
              <CardHeader
                title="Parceladas ativas"
                action={<span className="text-[13px] text-muted">{formatMoney(thisMonth.value)} em {monthNames[thisMonth.month].toLowerCase()}</span>}
              />
              {!purchases.length ? (
                <EmptyState title="Nada parcelado" description="Compras parceladas aparecem aqui com o que falta pagar." />
              ) : (
                <ul>
                  {purchases.map((purchase) => (
                    <li key={purchase.groupId} className="border-t border-border first:border-t-0">
                      <button
                        type="button"
                        onClick={() => setDetail(purchase)}
                        className="-mx-2 flex w-[calc(100%+16px)] flex-col gap-2 rounded-tile px-2 py-3 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[15px] font-semibold">{purchase.description}</span>
                            <PayChip card={card(purchase.cardId)} />
                          </span>
                          <span className="shrink-0">
                            <Money value={purchase.perMonth} size="sm" /> <span className="text-[13px] text-muted">/mês</span>
                          </span>
                        </span>
                        <ProgressBar value={purchase.current} max={purchase.count} label={`Parcela ${purchase.current} de ${purchase.count}`} />
                        <span className="flex justify-between gap-3 text-[13px] text-muted">
                          <span>
                            Parcela {purchase.current} de {purchase.count}
                          </span>
                          <span>{purchase.remaining > 0 ? `Restam ${formatMoney(purchase.remaining)}` : "Última parcela"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Link
              to="/recorrentes"
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <IconTile>
                <Repeat size={20} />
              </IconTile>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">Fixas e recorrentes</span>
                <span className="block text-[13px] text-muted">{formatMoney(fixedMonthly)} todo mês</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="text-muted" />
            </Link>
            {!desktop && newPurchase}
          </div>
        </div>
      )}
      <PurchaseSheet purchase={detail} card={detail ? card(detail.cardId) : undefined} today={today} onClose={() => setDetail(null)} />
    </>
  );
}

function PurchaseSheet({ purchase, card, today, onClose }: { purchase: Purchase | null; card?: Card; today: string; onClose: () => void }) {
  const remove = useDeleteTransaction();
  const { scheduleDelete } = usePendingDeletes();
  const [confirming, setConfirming] = useState(false);
  if (!purchase) return null;
  const currentMonth = today.slice(0, 7);
  return (
    <>
      <Sheet open onClose={onClose} title={purchase.description} description={`${formatMoney(purchase.total)} em ${purchase.count}x · ${card ? `${card.name} •••• ${card.last4}` : "À vista"}`}>
        <ul>
          {purchase.parcels.map((parcel) => {
            const month = parcel.date.slice(0, 7);
            const state = month < currentMonth ? "Lançada" : month === currentMonth ? "Este mês" : "Futura";
            return (
              <li key={parcel.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-border first:border-t-0">
                <span className={cx("text-[15px]", month < currentMonth && "text-muted")}>
                  {parcel.number}/{purchase.count} · {formatShortDate(parcel.date)} {parcel.date.slice(0, 4)}
                </span>
                <span className="flex items-center gap-3">
                  <span className={cx("text-[13px]", state === "Este mês" ? "font-semibold text-primary" : "text-muted")}>{state}</span>
                  <Money value={parcel.amount} size="sm" />
                </span>
              </li>
            );
          })}
        </ul>
        <Button variant="link" className="self-start !text-expense" onClick={() => setConfirming(true)}>
          Excluir compra parcelada
        </Button>
      </Sheet>
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir compra parcelada?"
        description={`As ${purchase.count} parcelas de “${purchase.description}” serão excluídas. Você pode desfazer logo em seguida.`}
        confirmLabel="Excluir parcelas"
        onConfirm={() => {
          setConfirming(false);
          onClose();
          scheduleDelete({
            keys: [`group:${purchase.groupId}`, ...purchase.parcels.map((p) => `tx:${p.id}`)],
            message: "Compra parcelada excluída",
            commit: () => remove.mutateAsync(purchase.parcels[0].id),
          });
        }}
      />
    </>
  );
}
