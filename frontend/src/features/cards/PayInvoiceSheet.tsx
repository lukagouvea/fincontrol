import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useAddPayment, useDeletePayment } from "../../hooks/useCards";
import type { Card } from "../../types/FinanceTypes";
import { dateKeyToIso, toDateKey } from "../../lib/dates";
import { formatMoney, fromCents, toCents } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, MoneyInput, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { Money } from "../../ui/Money";
import { useToast } from "../../ui/Toast";
import type { Invoice } from "../invoice";
import { dueLabel, invoiceMonthName } from "./invoiceLabels";

/** Pagar fatura: registra o pagamento e libera o limite. Não é gasto novo. */
export function PayInvoiceSheet({
  card,
  invoice,
  available,
  onClose,
}: {
  card: Card | null;
  invoice: Invoice | null;
  available: number;
  onClose: () => void;
}) {
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const showToast = useToast();
  const [mode, setMode] = useState<"total" | "outro">("total");
  const [text, setText] = useState<string>();
  const [value, setValue] = useState<number | null>(null);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoice) return;
    setMode("total");
    setText(undefined);
    setValue(null);
    setDate(toDateKey(new Date()));
    setError("");
  }, [invoice]);

  if (!card || !invoice) return null;
  const amount = mode === "total" ? invoice.remaining : value ?? 0;
  const after = fromCents(toCents(available) + toCents(Math.min(amount, invoice.remaining)));
  const settles = amount >= invoice.remaining;

  const confirm = async () => {
    if (!(amount > 0)) {
      setError("Informe quanto foi pago.");
      return;
    }
    setError("");
    try {
      const payment = await addPayment.mutateAsync({
        cardId: card.id,
        payment: { invoiceMonth: invoice.key, amount, paidAt: dateKeyToIso(date) },
      });
      showToast({
        message: settles ? `Fatura ${card.name} paga` : "Pagamento registrado",
        actionLabel: "Desfazer",
        onAction: () => deletePayment.mutate({ cardId: card.id, paymentId: payment.id }),
      });
      onClose();
    } catch {
      setError("Não foi possível registrar o pagamento. Tente de novo.");
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!addPayment.isPending}
      mobile="full"
      title="Pagar fatura"
      footer={
        <Button size="lg" block loading={addPayment.isPending} onClick={confirm} className="lg:w-auto">
          Confirmar pagamento
        </Button>
      }
    >
      <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
        <div className="flex justify-between gap-3 text-[13px] text-muted">
          <span>
            Fatura {card.name} · {invoiceMonthName(invoice.key)}
          </span>
          <span>{dueLabel(invoice.dueDate, toDateKey(new Date()))}</span>
        </div>
        <Money value={invoice.remaining} size="lg" />
        {invoice.paid > 0 && <span className="text-[13px] text-muted">Já pago: {formatMoney(invoice.paid)}</span>}
      </div>
      <Segmented
        label="Valor do pagamento"
        value={mode}
        onChange={setMode}
        options={[
          { value: "total", label: "Valor total" },
          { value: "outro", label: "Outro valor" },
        ]}
      />
      {mode === "outro" && (
        <Field label="Valor pago" error={error || undefined}>
          <MoneyInput value={text} onValueChange={(next) => setText(next)} onNumberChange={setValue} autoFocus />
        </Field>
      )}
      <Field label="Data do pagamento">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <p className="flex items-start gap-3 rounded-2xl bg-primary-tint p-4 text-sm text-ink">
        <ShieldCheck size={20} aria-hidden="true" className="shrink-0 text-primary" />
        <span>
          <strong>Pagar a fatura não é um gasto novo.</strong> As compras já contam nos seus gastos, na data de cada compra. Aqui você só
          registra que a fatura foi paga.
        </span>
      </p>
      <dl className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Situação da fatura</dt>
          <dd className="font-semibold">{settles ? "Paga" : "Paga em parte"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Limite disponível</dt>
          <dd className="font-semibold">
            {formatMoney(available)} → {formatMoney(after)}
          </dd>
        </div>
      </dl>
      {error && mode === "total" && (
        <p role="alert" className="text-sm text-expense">
          {error}
        </p>
      )}
    </Sheet>
  );
}
