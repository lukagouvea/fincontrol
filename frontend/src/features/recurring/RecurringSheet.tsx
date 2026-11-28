import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../../hooks/useCategories";
import { useCards } from "../../hooks/useCards";
import { fixedTransactionService } from "../../services/fixedTransactionService";
import type { FixedTransaction } from "../../types/FinanceTypes";
import { getFixedItemVersion } from "../../utils/financeUtils";
import { dateKeyToIso, isoToDateKey, monthIndex, fromMonthIndex, monthNames, shortMonthName, toDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { MoneyInput } from "../../ui/MoneyInput";
import { Segmented } from "../../ui/Segmented";
import { Pause, Square } from "lucide-react";
import { useToast } from "../../ui/Toast";
import type { EntryType } from "../ledger";

export type RecurringSheetState =
  | { kind: "create"; type: EntryType }
  | { kind: "edit"; item: FixedTransaction; type: EntryType };

const monthValue = (index: number) => {
  const { year, month } = fromMonthIndex(index);
  return `${year}-${String(month + 1).padStart(2, "0")}`;
};

const versionLabel = (effectiveFrom: string) => {
  const [year, month] = effectiveFrom.split("-").map(Number);
  return `${shortMonthName(month - 1)}/${year}`;
};

/**
 * Mês do próximo lançamento: o deste mês, se ainda não aconteceu; senão o
 * próximo. É o mês que "Pausar por um mês" pula.
 */
export function defaultEffectiveMonth(item: FixedTransaction, today = new Date()) {
  const { day } = getFixedItemVersion(item, today.getFullYear(), today.getMonth());
  const current = monthIndex(today.getFullYear(), today.getMonth());
  return today.getDate() < day ? current : current + 1;
}

export function RecurringSheet({
  state,
  onClose,
  monthAction,
}: {
  state: RecurringSheetState | null;
  onClose: () => void;
  /** Atalho para mudar só o valor de um mês (variação), quando há ocorrência. */
  monthAction?: { label: string; onClick: () => void };
}) {
  const formId = useId();
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();
  const showToast = useToast();
  const editing = state?.kind === "edit" ? state.item : null;

  const [type, setType] = useState<EntryType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [day, setDay] = useState("");
  // Categoria escolhida; a usada é `categoryId`, abaixo (cai na primeira do tipo se não valer).
  const [chosenCategoryId, setCategoryId] = useState("");
  const [cardId, setCardId] = useState("");
  const cardsQuery = useCards();
  const [start, setStart] = useState("");
  const [ends, setEnds] = useState<"never" | "date">("never");
  const [end, setEnd] = useState("");
  const [scope, setScope] = useState<"from" | "all">("from");
  const [from, setFrom] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (!state) return;
    const item = editing;
    setType(state.type);
    setDescription(item?.description ?? "");
    setAmount(item?.amount ?? null);
    setDay(item ? String(item.day) : String(new Date().getDate()));
    setCategoryId(item?.categoryId ?? "");
    setCardId(item?.cardId ?? "");
    setStart(item ? isoToDateKey(item.startDate) : toDateKey(new Date()));
    setEnds(item?.endDate ? "date" : "never");
    setEnd(item?.endDate ? isoToDateKey(item.endDate) : "");
    setScope("from");
    // Edição vale por padrão a partir do mês atual, inclusive se o lançamento
    // dele já aconteceu (decisão do dono, GAP.md). A pausa usa o próximo lançamento.
    setFrom(item ? monthValue(monthIndex(new Date().getFullYear(), new Date().getMonth())) : "");
    setErrors({});
    setSubmitError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === type && (c.active !== false || c.id === chosenCategoryId)),
    [categoriesQuery.data, type, chosenCategoryId],
  );
  // Categoria padrão: a primeira do tipo, quando nenhuma (válida) foi escolhida.
  // Derivada na renderização: um efeito rodava no instante em que a folha abria
  // ainda com o tipo anterior e trocava a categoria salva (igual à TransactionSheet).
  const categoryId = categories.some((c) => c.id === chosenCategoryId) ? chosenCategoryId : categories[0]?.id ?? "";

  const changed = editing
    ? {
        amount: amount !== editing.amount,
        categoryId: categoryId !== (editing.categoryId ?? ""),
        day: Number(day) !== editing.day,
        cardId: (type === "expense" && cardId ? cardId : null) !== (editing.cardId ?? null),
      }
    : { amount: false, categoryId: false, day: false, cardId: false };
  // A forma de pagamento também tem histórico: trocar de cartão pergunta "a partir de quando".
  const versionedChanged = changed.amount || changed.categoryId || changed.day || changed.cardId;
  const replacesAdjustments = scope === "all" && changed.amount && (editing?.versions?.length ?? 0) > 1;

  const now = monthIndex(new Date().getFullYear(), new Date().getMonth());
  const fromOptions = Array.from({ length: 25 }, (_, i) => now - 12 + i);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["fixed-incomes"] }),
      queryClient.invalidateQueries({ queryKey: ["monthly-variations"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    ]);

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        description: description.trim(),
        type,
        startDate: dateKeyToIso(start),
        endDate: ends === "date" && end ? dateKeyToIso(end) : null,
      };
      const payment = type === "expense" && cardId ? cardId : null;
      if (editing) {
        // Valor, categoria e dia têm histórico: só os que mudaram vão, para não
        // sobrescrever os outros nos meses afetados.
        const update = fixedTransactionService[type === "income" ? "updateIncome" : "updateExpense"];
        return update(editing.id, {
          ...base,
          ...(changed.amount && { amount: amount! }),
          ...(changed.categoryId && { categoryId }),
          ...(changed.day && { day: Number(day) }),
          // Só se mudou: reenviar o mesmo cartão com "corrigir todo o histórico" apagaria trocas antigas.
          ...(changed.cardId && { cardId: payment }),
          ...(versionedChanged && { scope, ...(scope === "from" && { effectiveFrom: from }) }),
        } as never);
      }
      const create = fixedTransactionService[type === "income" ? "createIncome" : "createExpense"];
      return create({ ...base, amount: amount!, categoryId, day: Number(day), cardId: payment } as never);
    },
    onSuccess: invalidate,
  });

  const setPause = useMutation({
    mutationFn: (month: string | null) =>
      fixedTransactionService[type === "income" ? "updateIncome" : "updateExpense"](editing!.id, { pausedFrom: month, pausedUntil: month } as never),
    onSuccess: invalidate,
  });

  const endNow = useMutation({
    mutationFn: () => fixedTransactionService[type === "income" ? "deleteIncome" : "deleteExpense"](editing!.id),
    onSuccess: invalidate,
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Informe um nome.";
    if (amount === null || amount <= 0) next.amount = "Informe um valor maior que zero.";
    const dayNumber = Number(day);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) next.day = "Escolha um dia de 1 a 31.";
    if (!categoryId) next.category = "Escolha uma categoria.";
    if (!start) next.start = "Informe quando começa.";
    if (ends === "date" && (!end || end < start)) next.end = "A data final deve ser igual ou posterior ao início.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitError("");
    try {
      await save.mutateAsync();
      showToast({ message: editing ? "Recorrência atualizada" : "Recorrência criada" });
      onClose();
    } catch {
      setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
    }
  };

  const ended = !!editing?.endDate && new Date(editing.endDate) <= new Date();
  const versions = [...(editing?.versions ?? [])].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  const busy = save.isPending || endNow.isPending || setPause.isPending;
  const pauseMonth = editing ? monthValue(defaultEffectiveMonth(editing)) : "";
  const pausedLabel = editing?.pausedFrom ? `${monthNames[Number(editing.pausedFrom.slice(5, 7)) - 1].toLowerCase()} de ${editing.pausedFrom.slice(0, 4)}` : "";
  const resumeMonth = editing?.pausedUntil ? monthValue(Number(editing.pausedUntil.slice(0, 4)) * 12 + Number(editing.pausedUntil.slice(5, 7))) : "";

  return (
    <>
      <Sheet
        open={!!state}
        onClose={onClose}
        dismissible={!busy}
        mobile="full"
        title={editing ? "Editar recorrência" : "Nova recorrência"}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={save.isPending} className="lg:w-auto">
              {editing ? "Salvar alterações" : "Criar recorrência"}
            </Button>
            {editing && !ended && (
              <Button variant="link" className="self-center !text-expense lg:mr-auto" disabled={busy} onClick={() => setConfirmEnd(true)}>
                Pausar ou encerrar
              </Button>
            )}
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
          {editing?.pausedFrom && (
            <div className="flex items-center justify-between gap-3 rounded-card bg-surface-2 p-4 text-sm">
              <span>
                <strong className="block text-[15px]">Pausada em {pausedLabel}</strong>
                Volta a lançar em {monthNames[Number(resumeMonth.slice(5, 7)) - 1]?.toLowerCase()}.
              </span>
              <Button
                variant="secondary"
                loading={setPause.isPending}
                onClick={async () => {
                  try {
                    await setPause.mutateAsync(null);
                    showToast({ message: "Recorrência retomada" });
                    onClose();
                  } catch {
                    setSubmitError("Não foi possível retomar. Tente de novo.");
                  }
                }}
              >
                Retomar
              </Button>
            </div>
          )}
          {!editing && (
            <Segmented
              label="Tipo"
              value={type}
              onChange={(value) => {
                setType(value);
                setCategoryId("");
              }}
              options={[
                { value: "expense", label: "Despesa" },
                { value: "income", label: "Receita" },
              ]}
            />
          )}
          <Field label="Nome" error={errors.description}>
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel" autoComplete="off" maxLength={120} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor" error={errors.amount}>
              <MoneyInput value={amount} onValueChange={setAmount} />
            </Field>
            <Field label="Todo dia" error={errors.day}>
              <TextInput type="number" inputMode="numeric" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
          </div>
          <Field label="Categoria" error={errors.category}>
            <SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          {type === "expense" && ((cardsQuery.data ?? []).some((card) => !card.archived) || cardId) && (
            <Field label="Pago com" hint={cardId ? "Cada lançamento entra na fatura do cartão." : undefined}>
              <SelectInput value={cardId} onChange={(e) => setCardId(e.target.value)}>
                <option value="">À vista (Pix, dinheiro, débito)</option>
                {(cardsQuery.data ?? [])
                  .filter((card) => !card.archived || card.id === cardId)
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} •••• {card.last4}
                    </option>
                  ))}
              </SelectInput>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Começa em" error={errors.start}>
              <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Termina">
              <SelectInput value={ends} onChange={(e) => setEnds(e.target.value as "never" | "date")}>
                <option value="never">Nunca</option>
                <option value="date">Em uma data</option>
              </SelectInput>
            </Field>
          </div>
          {ends === "date" && (
            <Field label="Data final" error={errors.end}>
              <TextInput type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          )}

          {editing && versionedChanged && (
            <fieldset className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
              <legend className="float-left mb-1 w-full text-[15px] font-semibold">Quando a alteração vale</legend>
              <label className="flex min-h-tap items-center gap-3">
                <input type="radio" name={`${formId}-scope`} checked={scope === "from"} onChange={() => setScope("from")} className="size-5 accent-[var(--primary)]" />
                <span className="flex-1 text-[15px]">A partir de</span>
                <SelectInput
                  aria-label="Mês de início da alteração"
                  value={from}
                  disabled={scope !== "from"}
                  onChange={(e) => setFrom(e.target.value)}
                  className="!h-11 !w-48 rounded-full"
                >
                  {fromOptions.map((index) => {
                    const { year, month } = fromMonthIndex(index);
                    return (
                      <option key={index} value={monthValue(index)}>
                        {monthNames[month].toLowerCase()} de {year}
                      </option>
                    );
                  })}
                </SelectInput>
              </label>
              <label className="flex min-h-tap items-center gap-3">
                <input type="radio" name={`${formId}-scope`} checked={scope === "all"} onChange={() => setScope("all")} className="size-5 accent-[var(--primary)]" />
                <span className="text-[15px]">Corrigir todo o histórico</span>
              </label>
              <p className={cx("text-[13px]", replacesAdjustments ? "text-expense" : "text-muted")}>
                {replacesAdjustments
                  ? "Substitui os reajustes anteriores: todos os meses passam a usar este valor."
                  : scope === "from"
                    ? "Os meses anteriores continuam como estavam."
                    : "Vale para todos os meses, inclusive os que já passaram."}
              </p>
            </fieldset>
          )}

          {editing && monthAction && !versionedChanged && (
            <Button variant="secondary" onClick={monthAction.onClick}>
              {monthAction.label}
            </Button>
          )}

          {versions.length > 1 && (
            <section aria-label="Histórico de valores" className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">Histórico de valores</h3>
              <ul className="text-[13px] text-muted">
                {versions.map((version) => (
                  <li key={version.effectiveFrom}>
                    {formatMoney(version.amount)} desde {versionLabel(version.effectiveFrom)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      <PauseOrEndSheet
        open={confirmEnd}
        name={editing?.description ?? ""}
        pauseLabel={pauseMonth ? `${monthNames[Number(pauseMonth.slice(5, 7)) - 1].toLowerCase()}` : ""}
        resumeLabel={pauseMonth ? `${monthNames[Number(pauseMonth.slice(5, 7)) % 12].toLowerCase()}, dia ${editing?.day ?? ""}` : ""}
        busy={endNow.isPending || setPause.isPending}
        onClose={() => setConfirmEnd(false)}
        onConfirm={async (choice) => {
          try {
            if (choice === "pause") await setPause.mutateAsync(pauseMonth);
            else await endNow.mutateAsync();
            setConfirmEnd(false);
            showToast({
              message: choice === "pause" ? "Recorrência pausada por um mês" : "Recorrência encerrada",
              ...(choice === "pause" && { actionLabel: "Desfazer", onAction: () => setPause.mutate(null) }),
            });
            onClose();
          } catch {
            setConfirmEnd(false);
            setSubmitError("Não foi possível concluir. Tente de novo.");
          }
        }}
      />
    </>
  );
}

/** Pausar ou encerrar (EncerrarRecorrencia.html). O histórico não muda. */
function PauseOrEndSheet({
  open,
  name,
  pauseLabel,
  resumeLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  pauseLabel: string;
  resumeLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (choice: "pause" | "end") => void;
}) {
  const [choice, setChoice] = useState<"pause" | "end">("pause");
  useEffect(() => {
    if (open) setChoice("pause");
  }, [open]);
  const option = (value: "pause" | "end", icon: React.ReactNode, title: string, text: string) => (
    <label className={cx("flex cursor-pointer items-center gap-3 rounded-card border-2 p-4", choice === value ? "border-primary bg-primary-tint" : "border-border bg-surface")}>
      <input type="radio" name="pause-or-end" className="sr-only" checked={choice === value} onChange={() => setChoice(value)} />
      <span aria-hidden="true" className="flex size-tap shrink-0 items-center justify-center rounded-tile bg-surface text-ink-2">
        {icon}
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-muted">{text}</span>
      </span>
    </label>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={`Pausar ou encerrar “${name}”?`}
      description="O histórico de lançamentos continua como está."
      footer={
        <>
          <Button size="lg" block loading={busy} className="lg:w-auto" onClick={() => onConfirm(choice)}>
            Confirmar
          </Button>
          <Button variant="secondary" size="lg" block disabled={busy} className="lg:w-auto" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Pausar ou encerrar" className="flex flex-col gap-3">
        {option("pause", <Pause size={20} />, "Pausar por um mês", `Não lança em ${pauseLabel}. Volta a lançar em ${resumeLabel}.`)}
        {option("end", <Square size={18} />, "Encerrar", "Não lança mais. Você pode recriar quando quiser.")}
      </div>
    </Sheet>
  );
}
