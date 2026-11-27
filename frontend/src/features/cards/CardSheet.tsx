import { useEffect, useId, useState, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useCreateCard, useDeleteCard, useUpdateCard } from "../../hooks/useCards";
import type { Card, CardColor } from "../../types/FinanceTypes";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, TextInput } from "../../ui/Field";
import { MoneyInput } from "../../ui/MoneyInput";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
import { useToast } from "../../ui/Toast";
import { CARD_COLORS, cardVars } from "./cardStyle";
import { CardArt } from "./CardArt";

/** Novo/Editar cartão (NovoCartao.html). Só guarda os 4 últimos dígitos. */
export function CardSheet({
  open,
  card,
  onClose,
  onSaved,
}: {
  open: boolean;
  card?: Card | null;
  onClose: () => void;
  onSaved?: (card: Card) => void;
}) {
  const formId = useId();
  const create = useCreateCard();
  const update = useUpdateCard();
  const remove = useDeleteCard();
  const showToast = useToast();
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [color, setColor] = useState<CardColor>("verde");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setLast4(card?.last4 ?? "");
    setLimit(card?.limit ?? null);
    setClosingDay(card ? String(card.closingDay) : "");
    setDueDay(card ? String(card.dueDay) : "");
    setColor(card?.color ?? "verde");
    setErrors({});
    setSubmitError("");
    // Por id: um refetch recria o objeto e apagaria o que está sendo editado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id]);

  const busy = create.isPending || update.isPending || remove.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const next: Record<string, string> = {};
    const closing = Number(closingDay);
    const due = Number(dueDay);
    if (!name.trim()) next.name = "Dê um apelido ao cartão.";
    if (!/^\d{4}$/.test(last4)) next.last4 = "Informe os 4 últimos dígitos.";
    if (limit === null || limit <= 0) next.limit = "Informe o limite.";
    if (!Number.isInteger(closing) || closing < 1 || closing > 31) next.closingDay = "Dia de 1 a 31.";
    if (!Number.isInteger(due) || due < 1 || due > 31) next.dueDay = "Dia de 1 a 31.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitError("");
    const input = { name: name.trim(), last4, limit: limit!, closingDay: closing, dueDay: due, color };
    try {
      const saved = card ? await update.mutateAsync({ id: card.id, data: input }) : await create.mutateAsync(input);
      showToast({ message: card ? "Cartão atualizado" : `Cartão ${saved.name} salvo` });
      onSaved?.(saved);
      onClose();
    } catch {
      setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
    }
  };

  const archive = async () => {
    if (!card) return;
    try {
      const result = await remove.mutateAsync(card.id);
      showToast({ message: result.deleted ? "Cartão excluído" : "Cartão arquivado. As compras continuam no histórico." });
      setConfirming(false);
      onClose();
    } catch {
      setConfirming(false);
      setSubmitError("Não foi possível remover o cartão.");
    }
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dismissible={!busy}
        title={card ? "Editar cartão" : "Novo cartão"}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={create.isPending || update.isPending} className="lg:w-auto">
              Salvar cartão
            </Button>
            {card && (
              <Button variant="link" className="self-center !text-expense lg:mr-auto" disabled={busy} onClick={() => setConfirming(true)}>
                Remover cartão
              </Button>
            )}
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <CardArt
            card={{ name: name || "Apelido", last4, color }}
            label="Limite"
            value={<span className="font-num text-lg font-semibold">{limit ? formatMoney(limit) : "R$ 0,00"}</span>}
            className="min-h-[130px]"
          />
          <Field label="Apelido" error={errors.name}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cartão Aurora" maxLength={60} autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Final do cartão" error={errors.last4} hint="4 últimos dígitos">
              <TextInput
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0000"
              />
            </Field>
            <Field label="Limite" error={errors.limit}>
              <MoneyInput value={limit} onValueChange={setLimit} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha dia" error={errors.closingDay}>
              <TextInput type="number" inputMode="numeric" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
            </Field>
            <Field label="Vence dia" error={errors.dueDay}>
              <TextInput type="number" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Cor</legend>
            <div role="radiogroup" aria-label="Cor do cartão" className="flex gap-3">
              {CARD_COLORS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={color === option.value}
                  aria-label={option.label}
                  onClick={() => setColor(option.value)}
                  className={cx(
                    "size-tap rounded-full border-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                    color === option.value ? "border-ink" : "border-bg",
                  )}
                  style={{ background: cardVars(option.value).background }}
                />
              ))}
            </div>
          </fieldset>
          <p className="flex items-start gap-2 text-[13px] text-muted">
            <ShieldCheck size={18} aria-hidden="true" className="shrink-0" />
            Guardamos apenas os 4 últimos dígitos. O número completo e o código de segurança nunca são pedidos.
          </p>
          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      <ConfirmSheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Remover ${card?.name ?? "cartão"}?`}
        description="Se o cartão já tem compras, ele é arquivado: sai das opções de pagamento, mas o histórico e as faturas continuam."
        confirmLabel="Remover"
        busy={remove.isPending}
        onConfirm={archive}
      />
    </>
  );
}
