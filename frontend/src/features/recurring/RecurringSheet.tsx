import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCategories } from "../../hooks/useCategories";
import { fixedTransactionService } from "../../services/fixedTransactionService";
import type { FixedTransaction } from "../../types/FinanceTypes";
import { getFixedItemVersion } from "../../utils/financeUtils";
import { dateKeyToIso, isoToDateKey, monthIndex, fromMonthIndex, monthNames, shortMonthName, toDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { cx } from "../../lib/cx";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, MoneyInput, SelectInput, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { ConfirmSheet } from "../../ui/ConfirmSheet";
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
 * Primeiro mês em que uma edição deveria valer: o lançamento deste mês, se
 * ainda não aconteceu; senão o próximo ("editar vale a partir do próximo
 * lançamento" — PRODUCT_RULES).
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
  const [amountText, setAmountText] = useState<string>();
  const [amount, setAmount] = useState<number | null>(null);
  const [day, setDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
    setAmountText(item ? String(item.amount).replace(".", ",") : undefined);
    setDay(item ? String(item.day) : String(new Date().getDate()));
    setCategoryId(item?.categoryId ?? "");
    setStart(item ? isoToDateKey(item.startDate) : toDateKey(new Date()));
    setEnds(item?.endDate ? "date" : "never");
    setEnd(item?.endDate ? isoToDateKey(item.endDate) : "");
    setScope("from");
    setFrom(item ? monthValue(defaultEffectiveMonth(item)) : "");
    setErrors({});
    setSubmitError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.type === type && (c.active !== false || c.id === categoryId)),
    [categoriesQuery.data, type, categoryId],
  );
  // Categoria padrão. Atualização funcional: lê o valor já inicializado pelo
  // efeito acima, mesmo que os dois rodem no mesmo ciclo.
  useEffect(() => {
    if (!state || !categories.length) return;
    setCategoryId((current) => (categories.some((c) => c.id === current) ? current : categories[0].id));
  }, [state, categories]);

  const changed = editing
    ? {
        amount: amount !== editing.amount,
        categoryId: categoryId !== (editing.categoryId ?? ""),
        day: Number(day) !== editing.day,
      }
    : { amount: false, categoryId: false, day: false };
  const versionedChanged = changed.amount || changed.categoryId || changed.day;
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
      if (editing) {
        // Valor, categoria e dia têm histórico: só os que mudaram vão, para não
        // sobrescrever os outros nos meses afetados.
        const update = fixedTransactionService[type === "income" ? "updateIncome" : "updateExpense"];
        return update(editing.id, {
          ...base,
          ...(changed.amount && { amount: amount! }),
          ...(changed.categoryId && { categoryId }),
          ...(changed.day && { day: Number(day) }),
          ...(versionedChanged && { scope, ...(scope === "from" && { effectiveFrom: from }) }),
        } as never);
      }
      const create = fixedTransactionService[type === "income" ? "createIncome" : "createExpense"];
      return create({ ...base, amount: amount!, categoryId, day: Number(day) } as never);
    },
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
  const busy = save.isPending || endNow.isPending;

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
                Encerrar recorrência
              </Button>
            )}
          </>
        }
      >
        <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
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
              <MoneyInput value={amountText} onValueChange={(value) => setAmountText(value)} onNumberChange={setAmount} />
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
      <ConfirmSheet
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title={`Encerrar “${editing?.description ?? ""}”?`}
        description="Não lança mais a partir de hoje. O histórico de lançamentos continua como está e você pode recriar quando quiser."
        confirmLabel="Encerrar"
        busy={endNow.isPending}
        onConfirm={async () => {
          try {
            await endNow.mutateAsync();
            setConfirmEnd(false);
            showToast({ message: "Recorrência encerrada" });
            onClose();
          } catch {
            setConfirmEnd(false);
            setSubmitError("Não foi possível encerrar. Tente de novo.");
          }
        }}
      />
    </>
  );
}
