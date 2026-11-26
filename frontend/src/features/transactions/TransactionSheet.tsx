import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import CurrencyInput from "react-currency-input-field";
import { MoreHorizontal } from "lucide-react";
import { useCategories } from "../../hooks/useCategories";
import {
  useAddCompraParcelada,
  useAddTransaction,
  useUpdateTransaction,
} from "../../hooks/useTransactions";
import { useAddFixedExpense, useAddFixedIncome } from "../../hooks/useFixedTransactions";
import type { Category } from "../../types/FinanceTypes";
import { cx } from "../../lib/cx";
import { dateKeyToIso, parseDateKey, toDateKey } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import { Sheet } from "../../ui/Sheet";
import { Button } from "../../ui/Button";
import { Field, SelectInput, TextInput } from "../../ui/Field";
import { Segmented } from "../../ui/Segmented";
import { Toggle } from "../../ui/Toggle";
import { useToast } from "../../ui/Toast";
import { CategoryIcon } from "../../ui/CategoryIcon";
import { CategoryPicker } from "./CategoryPicker";
import type { EntryType, LedgerEntry } from "../ledger";

export type TransactionDraft = {
  type?: EntryType;
  amount?: number;
  description?: string;
  categoryId?: string | null;
  date?: string;
};

export type TransactionSheetMode =
  | { kind: "create"; draft?: TransactionDraft }
  | { kind: "edit"; entry: LedgerEntry };

const QUICK_CATEGORIES = 5;
const MAX_INSTALLMENTS = 48;

export function TransactionSheet({
  open,
  mode,
  onClose,
}: {
  open: boolean;
  mode: TransactionSheetMode;
  onClose: () => void;
}) {
  const formId = useId();
  const editing = mode.kind === "edit" ? mode.entry : null;
  const categoriesQuery = useCategories();
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  const addInstallments = useAddCompraParcelada();
  const addFixedExpense = useAddFixedExpense();
  const addFixedIncome = useAddFixedIncome();
  const showToast = useToast();

  const [type, setType] = useState<EntryType>("expense");
  const [amountText, setAmountText] = useState<string | undefined>();
  const [amount, setAmount] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [installments, setInstallments] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Rascunho reinicia só ao abrir ou ao trocar o registro editado.
  useEffect(() => {
    if (!open) return;
    const source = editing ?? (mode.kind === "create" ? mode.draft : undefined);
    setType(source?.type ?? "expense");
    setAmount(source?.amount ?? null);
    setAmountText(source?.amount !== undefined ? String(source.amount).replace(".", ",") : undefined);
    setCategoryId(source?.categoryId ?? "");
    setDescription(source?.description ?? "");
    setDate(source?.date ?? toDateKey(new Date()));
    setInstallments(1);
    setRepeat(false);
    setErrors({});
    setSubmitError("");
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.key]);

  const categories = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter(
        (category) => category.type === type && (category.active !== false || category.id === categoryId),
      ),
    [categoriesQuery.data, type, categoryId],
  );

  // Categoria padrão: a primeira do tipo, quando nenhuma (válida) foi escolhida.
  useEffect(() => {
    if (!open || !categories.length) return;
    if (!categories.some((category) => category.id === categoryId)) setCategoryId(categories[0].id);
  }, [open, categories, categoryId]);

  const quick = useMemo(() => {
    const first = categories.slice(0, QUICK_CATEGORIES);
    const selected = categories.find((category) => category.id === categoryId);
    if (selected && !first.includes(selected)) first[first.length - 1] = selected;
    return first;
  }, [categories, categoryId]);

  const isInstallment = !editing && type === "expense" && installments > 1;
  const canRepeat = !editing && !isInstallment;
  const day = parseDateKey(date).getDate();
  const label = type === "income" ? "receita" : "despesa";
  const title = editing ? `Editar ${label}` : "Nova transação";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const next: Record<string, string> = {};
    if (amount === null || !Number.isFinite(amount) || amount <= 0) next.amount = "Informe um valor maior que zero.";
    if (!categoryId) next.category = "Escolha uma categoria.";
    if (!description.trim()) next.description = "Informe uma descrição.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = "Informe a data.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setSubmitError("");
    const payload = {
      description: description.trim(),
      amount: amount!,
      categoryId,
      date: dateKeyToIso(date),
      type,
    };
    try {
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, data: payload });
        showToast({ message: `${type === "income" ? "Receita" : "Despesa"} atualizada` });
      } else if (isInstallment) {
        await addInstallments.mutateAsync({ ...payload, numParcelas: installments });
        showToast({ message: `Compra parcelada em ${installments}x salva` });
      } else if (repeat) {
        const rule = { description: payload.description, amount: payload.amount, categoryId, day, startDate: payload.date, type };
        await (type === "income" ? addFixedIncome : addFixedExpense).mutateAsync(rule as never);
        showToast({ message: `Recorrente salva: todo dia ${day}` });
      } else {
        await addTransaction.mutateAsync(payload as never);
        showToast({ message: `${type === "income" ? "Receita" : "Despesa"} salva` });
      }
      onClose();
    } catch {
      setSubmitError("Não foi possível salvar. O que você preencheu foi mantido.");
      setSubmitting(false);
    }
  };

  const perInstallment = amount && installments > 1 ? amount / installments : null;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        mobile="full"
        dismissible={!submitting}
        footer={
          <>
            <Button type="submit" form={formId} size="lg" block loading={submitting} className="lg:w-auto">
              {editing ? "Salvar alterações" : `Salvar ${label}`}
            </Button>
            <Button variant="secondary" size="lg" onClick={onClose} disabled={submitting} className="hidden lg:inline-flex">
              Cancelar
            </Button>
          </>
        }
      >
        <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
          {!editing && (
            <Segmented
              label="Tipo"
              value={type}
              onChange={(value) => {
                setType(value);
                setCategoryId("");
                if (value === "income") setInstallments(1);
              }}
              options={[
                { value: "expense", label: "Despesa" },
                { value: "income", label: "Receita" },
              ]}
            />
          )}

          <div className="flex flex-col items-center gap-1">
            <label htmlFor={`${formId}-amount`} className="text-sm text-muted">
              Valor{isInstallment ? " total" : ""}
            </label>
            <CurrencyInput
              id={`${formId}-amount`}
              intlConfig={{ locale: "pt-BR", currency: "BRL" }}
              decimalsLimit={2}
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={amountText}
              onValueChange={(value, _name, values) => {
                setAmountText(value);
                setAmount(values?.float ?? null);
              }}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? `${formId}-amount-error` : undefined}
              className={cx(
                "min-h-[64px] w-full rounded-field border-0 bg-transparent p-0 text-center font-num text-[42px] font-semibold leading-tight tracking-[-0.02em] text-ink placeholder:text-muted-2",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus",
                type === "expense" ? "caret-expense" : "caret-income",
              )}
            />
            {errors.amount && (
              <p id={`${formId}-amount-error`} className="text-[13px] text-expense">
                {errors.amount}
              </p>
            )}
            {perInstallment && (
              <p className="text-[13px] text-muted">
                {installments}x de {formatMoney(perInstallment)}
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Categoria</legend>
            {categoriesQuery.isError ? (
              <p role="alert" className="text-[13px] text-expense">
                Não foi possível carregar as categorias.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
                {quick.map((category) => (
                  <CategoryChoice
                    key={category.id}
                    category={category}
                    selected={category.id === categoryId}
                    onSelect={() => setCategoryId(category.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className={cx(
                    choiceBase,
                    "border-dashed border-border-strong text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <MoreHorizontal size={20} aria-hidden="true" className="lg:hidden" />
                  <span>{categories.length > QUICK_CATEGORIES ? "Mais" : "+ Nova"}</span>
                </button>
              </div>
            )}
            {errors.category && <p className="text-[13px] text-expense">{errors.category}</p>}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[1fr_auto] lg:grid-cols-[1fr_200px]">
            <Field label="Descrição" error={errors.description}>
              <TextInput
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={type === "income" ? "Ex.: Cashback" : "Ex.: Restaurante"}
                autoComplete="off"
                maxLength={120}
              />
            </Field>
            <Field label="Data" error={errors.date}>
              <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
          </div>

          {!editing && type === "expense" && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor={`${formId}-installments`} className="text-[15px] font-semibold">
                  Parcelas
                </label>
                <p className="text-[13px] text-muted">
                  {installments > 1 ? "Uma parcela por mês a partir da data" : "À vista ou parcela única"}
                </p>
              </div>
              <SelectInput
                id={`${formId}-installments`}
                value={installments}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setInstallments(value);
                  if (value > 1) setRepeat(false);
                }}
                className="!w-28 shrink-0 rounded-full"
              >
                {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((count) => (
                  <option key={count} value={count}>
                    {count}x
                  </option>
                ))}
              </SelectInput>
            </div>
          )}

          {canRepeat && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 lg:border-0 lg:p-0">
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold">Repetir todo mês</span>
                <span className="block text-[13px] text-muted">
                  {repeat ? `Lança sozinho todo dia ${day}` : "Desligado"}
                </span>
              </div>
              <Toggle checked={repeat} onChange={setRepeat} label="Repetir todo mês" />
            </div>
          )}

          {submitError && (
            <p role="alert" className="rounded-field bg-expense-tint px-4 py-3 text-sm text-expense">
              {submitError}
            </p>
          )}
        </form>
      </Sheet>
      <CategoryPicker
        open={pickerOpen}
        type={type}
        selectedId={categoryId}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          setCategoryId(id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const choiceBase =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-sm font-semibold " +
  "lg:min-h-tap lg:flex-row lg:rounded-full lg:px-4 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function CategoryChoice({
  category,
  selected,
  onSelect,
}: {
  category: Category;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cx(
        choiceBase,
        selected
          ? "border-primary bg-primary-tint text-primary lg:bg-primary lg:text-on-primary"
          : "border-border bg-surface text-ink hover:bg-surface-2",
      )}
    >
      <CategoryIcon category={category} className="!size-6 !bg-transparent lg:hidden" />
      <span className="max-w-full truncate">{category.name}</span>
    </button>
  );
}
