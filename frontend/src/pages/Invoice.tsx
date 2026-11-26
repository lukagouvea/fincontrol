import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategories } from "../hooks/useCategories";
import { useDeletePayment } from "../hooks/useCards";
import { useCardInvoices } from "../features/useCardInvoices";
import { makeCategoryLookup } from "../features/categories";
import { InvoiceItems } from "../features/cards/InvoiceItems";
import { PayInvoiceSheet } from "../features/cards/PayInvoiceSheet";
import { closesLabel, dueLabel, invoiceMonthName, statusLabel, statusTone } from "../features/cards/invoiceLabels";
import { cardVars } from "../features/cards/cardStyle";
import { closingDateOf, dueDateOf, invoiceKeyFor, shiftInvoiceKey, type Invoice as InvoiceData } from "../features/invoice";
import { todayKey } from "../features/useLedger";
import { formatShortDate, isoToDateKey } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Chip";
import { Money } from "../ui/Money";
import { PageHeader } from "../ui/PageHeader";
import { LoadingCard } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { useToast } from "../ui/Toast";

export function Invoice() {
  const { cardId } = useParams();
  const [params, setParams] = useSearchParams();
  const invoices = useCardInvoices();
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const deletePayment = useDeletePayment();
  const showToast = useToast();
  const [paying, setPaying] = useState(false);
  const today = todayKey();
  const summary = invoices.data.find((item) => item.card.id === cardId);

  if (invoices.isLoading) return <LoadingCard label="Carregando fatura…" rows={4} />;
  if (!summary)
    return (
      <>
        <PageHeader back="/cartoes" title="Fatura" />
        <Card>
          <EmptyState title="Cartão não encontrado" description="Ele pode ter sido removido." />
        </Card>
      </>
    );

  const { card } = summary;
  const currentKey = invoiceKeyFor(today, card.closingDay);
  const key = /^\d{4}-\d{2}$/.test(params.get("f") ?? "") ? params.get("f")! : currentKey;
  const invoice: InvoiceData = summary.invoices.find((item) => item.key === key) ?? {
    key,
    closingDate: closingDateOf(key, card.closingDay),
    dueDate: dueDateOf(key, card),
    items: [],
    total: 0,
    paid: 0,
    remaining: 0,
    status: key > currentKey ? "futura" : "paga",
  };
  const go = (months: number) => setParams({ f: shiftInvoiceKey(key, months) }, { replace: true });
  const vars = cardVars(card.color);
  const label = key === currentKey ? "Fatura atual" : `Fatura de ${invoiceMonthName(key)}`;
  const payments = card.payments.filter((payment) => payment.invoiceMonth === key);
  const nav = "inline-flex size-tap items-center justify-center rounded-full text-ink hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus";

  return (
    <>
      <PageHeader back="/cartoes" title={`Fatura ${card.name}`} eyebrow={<span className="hidden lg:inline">•••• {card.last4}</span>} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between rounded-full border border-border bg-surface">
            <button type="button" className={nav} aria-label="Fatura anterior" onClick={() => go(-1)}>
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <span aria-live="polite" className="text-sm font-semibold">
              {invoiceMonthName(key).replace(/^./, (c) => c.toUpperCase())} {key.slice(0, 4)}
              {key !== currentKey && (
                <button type="button" onClick={() => setParams({}, { replace: true })} className="ml-2 text-primary underline-offset-4 hover:underline">
                  ir para a atual
                </button>
              )}
            </span>
            <button type="button" className={nav} aria-label="Próxima fatura" onClick={() => go(1)}>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <section aria-label={label} className="flex flex-col gap-3 rounded-card p-5" style={{ background: vars.background, color: vars.ink }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm opacity-80">{label}</span>
              <Badge tone={statusTone[invoice.status]}>{statusLabel[invoice.status]}</Badge>
            </div>
            <Money value={invoice.total} size="hero" className="!text-[36px] lg:!text-[40px]" />
            <div className="flex justify-between gap-3 text-[13px] opacity-80">
              <span>{closesLabel(invoice.closingDate, today)}</span>
              <span>{dueLabel(invoice.dueDate, today)}</span>
            </div>
          </section>

          <Card>
            <h2 className="text-[15px] font-semibold">Compras</h2>
            {invoices.isError ? (
              <p role="alert" className="text-sm text-expense">Não foi possível carregar as compras.</p>
            ) : (
              <InvoiceItems items={invoice.items} category={category} />
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          <Card>
            <dl className="flex flex-col gap-2 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Total da fatura</dt>
                <dd className="font-semibold">{formatMoney(invoice.total)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Pago</dt>
                <dd className="font-semibold">{formatMoney(invoice.paid)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Falta pagar</dt>
                <dd className="font-semibold">{formatMoney(invoice.remaining)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-2">
                <dt className="text-muted">Limite disponível</dt>
                <dd className="font-semibold">{formatMoney(summary.available)}</dd>
              </div>
            </dl>
            {invoice.remaining > 0 && invoice.status !== "futura" && (
              <Button size="lg" block onClick={() => setPaying(true)}>
                Registrar pagamento
              </Button>
            )}
          </Card>
          {payments.length > 0 && (
            <Card>
              <h2 className="text-[15px] font-semibold">Pagamentos</h2>
              <ul>
                {payments.map((payment) => (
                  <li key={payment.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-border first:border-t-0">
                    <span>
                      <span className="block text-[15px] font-semibold">{formatMoney(payment.amount)}</span>
                      <span className="block text-[13px] text-muted">Pago em {formatShortDate(isoToDateKey(payment.paidAt))}</span>
                    </span>
                    <Button
                      variant="link"
                      className="!text-expense"
                      loading={deletePayment.isPending && deletePayment.variables?.paymentId === payment.id}
                      onClick={async () => {
                        try {
                          await deletePayment.mutateAsync({ cardId: card.id, paymentId: payment.id });
                          showToast({ message: "Pagamento removido" });
                        } catch {
                          showToast({ message: "Não foi possível remover o pagamento." });
                        }
                      }}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {paying && (
        <PayInvoiceSheet card={card} invoice={invoice} available={summary.available} onClose={() => setPaying(false)} />
      )}
    </>
  );
}
