import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Clock, CreditCard, Info, Plus } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useCardInvoices, type CardSummary } from "../features/useCardInvoices";
import { makeCategoryLookup } from "../features/categories";
import { CardSheet } from "../features/cards/CardSheet";
import { CardArt } from "../features/cards/CardArt";
import { InvoiceItems } from "../features/cards/InvoiceItems";
import { PayInvoiceSheet } from "../features/cards/PayInvoiceSheet";
import { closesLabel, dueLabel, invoiceMonthName, statusLabel, statusTone } from "../features/cards/invoiceLabels";
import { cardVars } from "../features/cards/cardStyle";
import { todayKey } from "../features/useLedger";
import type { Card } from "../types/FinanceTypes";
import { formatShortDate } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { cx } from "../lib/cx";
import { Button, ButtonLink, IconButton } from "../ui/Button";
import { Card as Panel, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Chip";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { LoadingCard } from "../ui/Skeleton";
import { IconTile } from "../ui/ListRow";

export function Cards() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const invoices = useCardInvoices();
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const [sheet, setSheet] = useState<{ open: boolean; card: Card | null }>({ open: false, card: null });
  const [paying, setPaying] = useState<CardSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const today = todayKey();

  const active = invoices.data.filter((summary) => !summary.card.archived);
  const selected = active.find((summary) => summary.card.id === selectedId) ?? active[0];
  const openNew = () => setSheet({ open: true, card: null });

  const header = (
    <PageHeader
      title="Cartões"
      eyebrow={<span className="hidden lg:inline">Faturas e limites</span>}
      actions={
        desktop ? (
          <>
            <ButtonLink to="/compromissos" variant="secondary">
              Compromissos futuros
            </ButtonLink>
            <Button icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
              Novo cartão
            </Button>
          </>
        ) : (
          <IconButton label="Novo cartão" onClick={openNew} className="!border-primary !bg-primary !text-on-primary">
            <Plus size={22} aria-hidden="true" />
          </IconButton>
        )
      }
    />
  );

  const sheets = (
    <>
      <CardSheet open={sheet.open} card={sheet.card} onClose={() => setSheet({ open: false, card: null })} onSaved={(card) => setSelectedId(card.id)} />
      <PayInvoiceSheet
        card={paying?.card ?? null}
        invoice={paying ? payableInvoice(paying) : null}
        available={paying?.available ?? 0}
        onClose={() => setPaying(null)}
      />
    </>
  );

  if (invoices.isLoading) return <>{header}<LoadingCard label="Carregando cartões…" rows={3} /></>;
  if (invoices.isError)
    return (
      <>
        {header}
        <Panel>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar os cartões.</p>
            <Button variant="secondary" onClick={invoices.retry}>
              Tentar novamente
            </Button>
          </div>
        </Panel>
      </>
    );

  if (!active.length)
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon={<CreditCard size={22} strokeWidth={1.8} />}
            title="Nenhum cartão ainda"
            description="Cadastre seu cartão de crédito para acompanhar a fatura e o limite. Pix, dinheiro e débito entram como “À vista”, sem cadastro."
            action={
              <Button size="lg" icon={<Plus size={18} aria-hidden="true" />} onClick={openNew}>
                Adicionar cartão
              </Button>
            }
          />
        </Panel>
        {sheets}
      </>
    );

  const avistaNote = (
    <div className="flex items-start gap-3 rounded-card bg-surface-2 p-4 text-sm">
      <Info size={20} aria-hidden="true" className="shrink-0 text-ink-2" />
      <p>
        <strong className="block text-[15px]">Pix, dinheiro e débito</strong>
        Ao lançar uma compra, escolha “À vista”. Não precisa cadastrar conta nem manter saldo.
      </p>
    </div>
  );

  if (!desktop) {
    return (
      <>
        {header}
        <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1" aria-label="Seus cartões">
          {active.map((summary) => (
            <Link
              key={summary.card.id}
              to={`/cartoes/${summary.card.id}/fatura`}
              className="w-[82%] shrink-0 snap-start rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <CardArt
                card={summary.card}
                label="Fatura atual"
                value={<Money value={summary.current.total} size="lg" className="!text-[24px]" />}
                footer={dueLabel(summary.current.dueDate, today)}
              />
            </Link>
          ))}
        </div>
        <section aria-label="Faturas em aberto" className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Faturas em aberto</h2>
          {active.map((summary) => (
            <LimitCard key={summary.card.id} summary={summary} today={today} />
          ))}
        </section>
        {avistaNote}
        <CommitmentsLink />
        {sheets}
      </>
    );
  }

  return (
    <>
      {header}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div role="listbox" aria-label="Seus cartões" className="flex flex-col gap-4">
            {active.map((summary) => (
              <button
                key={summary.card.id}
                type="button"
                role="option"
                aria-selected={summary.card.id === selected?.card.id}
                onClick={() => setSelectedId(summary.card.id)}
                className="rounded-card text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
              >
                <CardArt
                  card={summary.card}
                  selected={summary.card.id === selected?.card.id}
                  value={<Money value={summary.current.total} size="lg" />}
                  footer={`Fatura ${statusLabel[summary.current.status].toLowerCase()} · limite ${formatMoney(summary.card.limit, { cents: false })}`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openNew}
            className="flex min-h-[64px] items-center justify-center gap-2 rounded-card border-2 border-dashed border-border-strong text-[15px] font-semibold text-ink-2 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <Plus size={18} aria-hidden="true" />
            Adicionar cartão
          </button>
          <Panel>
            <h2 className="text-[15px] font-semibold">E o que não é cartão?</h2>
            <p className="text-sm text-muted">Pix, dinheiro e débito entram como “À vista”. Não há saldo para manter atualizado.</p>
          </Panel>
        </div>

        {selected && (
          <Panel className="gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">
                  Fatura {selected.card.name} · {closesLabel(selected.current.closingDate, today).toLowerCase()}
                </p>
                <Money value={selected.current.total} size="lg" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setSheet({ open: true, card: selected.card })}>
                  Editar cartão
                </Button>
                {payableInvoice(selected) && <Button onClick={() => setPaying(selected)}>Registrar pagamento</Button>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Disponível" value={formatMoney(selected.available)} />
              <Stat label="Vencimento" value={formatShortDate(selected.current.dueDate)} />
              <Stat label="Limite" value={formatMoney(selected.card.limit)} />
            </div>
            <LimitBar summary={selected} />
            <OverdueNotice summary={selected} onPay={() => setPaying(selected)} />
            <div>
              <CardHeader title="Lançamentos" action={{ label: "Ver fatura completa", to: `/cartoes/${selected.card.id}/fatura` }} />
              <InvoiceItems items={selected.current.items} category={category} limit={8} />
            </div>
          </Panel>
        )}
      </div>
      {sheets}
    </>
  );
}

/** Fatura a pagar: a mais antiga com saldo (vencida/fechada) ou a atual. */
export function payableInvoice(summary: CardSummary) {
  return summary.invoices.find((invoice) => invoice.remaining > 0 && invoice.status !== "futura") ?? null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="font-num text-lg font-semibold">{value}</div>
    </div>
  );
}

function LimitBar({ summary }: { summary: CardSummary }) {
  const percent = Math.min(100, Math.max(0, (summary.used / summary.card.limit) * 100));
  return (
    <div
      role="img"
      aria-label={`${Math.round(percent)}% do limite usado`}
      className="h-2 overflow-hidden rounded bg-surface-2"
    >
      <div className="h-full rounded" style={{ width: `${percent}%`, background: cardVars(summary.card.color).background }} />
    </div>
  );
}

function OverdueNotice({ summary, onPay }: { summary: CardSummary; onPay: () => void }) {
  const overdue = summary.invoices.find((invoice) => invoice.status === "vencida" || invoice.status === "fechada");
  if (!overdue) return null;
  return (
    <div className={cx("flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm", overdue.status === "vencida" ? "bg-expense-tint text-expense" : "bg-surface-2")}>
      <span>
        Fatura de {invoiceMonthName(overdue.key)} {overdue.status === "vencida" ? "venceu" : "fechou"}: faltam{" "}
        <strong>{formatMoney(overdue.remaining)}</strong>.
      </span>
      <Button variant="secondary" onClick={onPay}>
        Registrar pagamento
      </Button>
    </div>
  );
}

function LimitCard({ summary, today }: { summary: CardSummary; today: string }) {
  const { card, current } = summary;
  return (
    <Link
      to={`/cartoes/${card.id}/fatura`}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold">{card.name}</span>
        <span className="flex items-center gap-1 text-[13px] font-semibold text-primary">
          {closesLabel(current.closingDate, today)} · Ver fatura
          <ChevronRight size={16} aria-hidden="true" />
        </span>
      </div>
      <LimitBar summary={summary} />
      <div className="flex justify-between gap-3 text-[13px] text-muted">
        <span>Disponível {formatMoney(summary.available)}</span>
        <span>Limite {formatMoney(card.limit)}</span>
      </div>
      {summary.invoices.some((invoice) => invoice.status === "vencida") && (
        <Badge tone={statusTone.vencida} className="self-start">
          Fatura vencida
        </Badge>
      )}
    </Link>
  );
}

function CommitmentsLink() {
  return (
    <Link
      to="/compromissos"
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
    >
      <IconTile>
        <Clock size={20} />
      </IconTile>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">Compromissos futuros</span>
        <span className="block text-[13px] text-muted">Parcelas e fixas dos próximos meses</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="text-muted" />
    </Link>
  );
}
