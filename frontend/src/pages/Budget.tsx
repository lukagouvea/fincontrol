import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, PieChart, Plus } from "lucide-react";
import CurrencyInput from "react-currency-input-field";
import { useCategories } from "../hooks/useCategories";
import { useSaveBudget } from "../hooks/useBudget";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedMonth } from "../app/MonthContext";
import { useMonthLedger } from "../features/useLedger";
import { useMonthBudget, type CategoryBudget } from "../features/useMonthBudget";
import { makeCategoryLookup, type CategoryLookup } from "../features/categories";
import { monthKeyOf } from "../features/budget";
import { fromMonthIndex, monthIndex, monthNames } from "../lib/dates";
import { formatMoney, fromCents, toCents } from "../lib/money";
import { cx } from "../lib/cx";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { ProgressBar } from "../ui/ProgressBar";
import { Sheet } from "../ui/Sheet";
import { Toggle } from "../ui/Toggle";
import { LoadingCard } from "../ui/Skeleton";
import { CategoryIcon } from "../ui/CategoryIcon";
import { useToast } from "../ui/Toast";
import { inputClass } from "../ui/Field";

/** Chave do rascunho: o limite "Geral" não tem categoria. */
const rowKey = (id: string | null) => id ?? "geral";
const GENERAL_NAME = "Geral";

/** Rascunho dos limites (texto do campo + número) por categoria. */
function useLimitDraft(rows: CategoryBudget[], resetKey: string) {
  const [values, setValues] = useState<Record<string, { text?: string; value: number | null }>>({});
  useEffect(() => {
    setValues(Object.fromEntries(rows.map((row) => [rowKey(row.categoryId), { text: row.limit ? String(row.limit).replace(".", ",") : undefined, value: row.limit }])));
    // Reinicia ao trocar de mês ou quando os dados salvos mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);
  const total = fromCents(Object.values(values).reduce((sum, item) => sum + (item.value && item.value > 0 ? toCents(item.value) : 0), 0));
  const dirty = rows.some((row) => (values[rowKey(row.categoryId)]?.value ?? null) !== row.limit);
  const payload = rows.map((row) => {
    const value = values[rowKey(row.categoryId)]?.value ?? null;
    return { categoryId: row.categoryId, amount: value && value > 0 ? value : null };
  });
  const set = (id: string | null, text: string | undefined, value: number | null) => setValues((current) => ({ ...current, [rowKey(id)]: { text, value } }));
  return { values, set, total, dirty, payload };
}

function LimitInput({ label, text, onChange, className }: { label: string; text?: string; onChange: (text: string | undefined, value: number | null) => void; className?: string }) {
  return (
    <CurrencyInput
      aria-label={label}
      intlConfig={{ locale: "pt-BR", currency: "BRL" }}
      decimalsLimit={2}
      inputMode="decimal"
      placeholder="Sem limite"
      value={text}
      onValueChange={(value, _name, values) => onChange(value, values?.float ?? null)}
      className={inputClass(false, cx("h-12 text-right font-num font-semibold", className))}
    />
  );
}

export function Budget() {
  const { month, year, setMonth } = useSelectedMonth();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const ledger = useMonthLedger(month, year);
  const budget = useMonthBudget(month, year, ledger.entries, !ledger.isLoading && !ledger.isError);
  const categoriesQuery = useCategories();
  const category = useMemo(() => makeCategoryLookup(categoriesQuery.data), [categoriesQuery.data]);
  const save = useSaveBudget();
  const showToast = useToast();
  const [editing, setEditing] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const name = monthNames[month].toLowerCase();
  const nextName = monthNames[fromMonthIndex(monthIndex(year, month) + 1).month].toLowerCase();

  // Edição mostra só categorias ativas (ou com limite); a lista, todas com gasto ou limite.
  const editable = (budget.data?.categories ?? []).filter((row) => row.categoryId === null || category(row.categoryId)?.active !== false || row.limit !== null);
  const draft = useLimitDraft(editable, `${year}-${month}-${JSON.stringify(editable.map((row) => [row.categoryId, row.limit]))}`);

  const submit = async () => {
    try {
      await save.mutateAsync({ month: monthKeyOf(year, month), repeat, limits: draft.payload });
      showToast({ message: repeat ? `Limites salvos a partir de ${name}` : `Limites salvos só para ${name}` });
      setEditing(false);
    } catch {
      showToast({ message: "Não foi possível salvar os limites." });
    }
  };

  const header = (
    <PageHeader
      title="Orçamento"
      eyebrow={<span className="hidden lg:inline">{monthNames[month]} de {year}</span>}
      actions={<MonthSwitcher month={month} year={year} onChange={setMonth} />}
    />
  );

  if (ledger.isLoading || budget.isLoading) return <>{header}<LoadingCard label="Carregando orçamento…" rows={5} /></>;
  if (ledger.isError || budget.isError || !budget.data)
    return (
      <>
        {header}
        <Card>
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-expense">Não foi possível carregar o orçamento.</p>
            <Button variant="secondary" onClick={() => (ledger.retry(), budget.retry())}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      </>
    );

  const data = budget.data;
  const over = data.categories.filter((row) => row.limit !== null && row.spent > row.limit);
  const repeatToggle = (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
      <span>
        <span className="block text-[15px] font-semibold">Repetir nos próximos meses</span>
        <span className="block text-[13px] text-muted">{repeat ? `Usar estes limites em ${nextName} e depois` : `Só em ${name}`}</span>
      </span>
      <Toggle checked={repeat} onChange={setRepeat} label="Repetir nos próximos meses" />
    </div>
  );

  const editor = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-card bg-hero p-5 text-on-hero">
        <span className="text-sm text-on-hero-muted">Orçamento total do mês</span>
        <Money value={draft.total} size="lg" />
        <span className="text-[13px] text-on-hero-muted">Soma dos limites abaixo</span>
      </div>
      <ul>
        {editable.map((row) => {
          const cat = category(row.categoryId);
          return (
            <li key={rowKey(row.categoryId)} className="flex min-h-16 items-center justify-between gap-3 border-b border-border">
              <span className="flex min-w-0 items-center gap-3">
                <CategoryIcon category={cat} />
                <span className="truncate text-[15px] font-semibold">{cat?.name ?? GENERAL_NAME}</span>
              </span>
              <LimitInput
                label={`Limite de ${cat?.name ?? GENERAL_NAME}`}
                text={draft.values[rowKey(row.categoryId)]?.text}
                onChange={(text, value) => draft.set(row.categoryId, text, value)}
                className="!w-40"
              />
            </li>
          );
        })}
      </ul>
      <Link to="/categorias" className="flex min-h-tap items-center gap-2 text-sm font-semibold text-primary">
        <Plus size={18} aria-hidden="true" />
        Nova categoria
      </Link>
      {repeatToggle}
    </div>
  );

  if (!data.hasBudget && !editing && !desktop)
    return (
      <>
        {header}
        <Card>
          <EmptyState
            icon={<PieChart size={22} strokeWidth={1.8} />}
            title={`Sem orçamento em ${name}`}
            description="Defina um limite para as categorias que quer controlar. O orçamento do mês é a soma deles, e o limite da semana sai daí."
            action={
              <Button size="lg" onClick={() => setEditing(true)}>
                Definir orçamento
              </Button>
            }
          />
        </Card>
        <EditorSheet open={editing} title={`Limites de ${name}`} onClose={() => setEditing(false)} onSave={submit} saving={save.isPending}>
          {editor}
        </EditorSheet>
      </>
    );

  const summaryCard = (
    <Card tone={desktop ? "default" : "hero"} className={desktop ? "lg:sticky lg:top-8" : undefined}>
      <span className={cx("text-sm", desktop ? "text-muted" : "text-on-hero-muted")}>{desktop ? "Restam do orçamento" : "Restam este mês"}</span>
      <Money value={data.remaining} size="lg" className={data.remaining < 0 ? "!text-expense" : undefined} />
      <ProgressBar value={data.spent} max={data.total || 1} tone={desktop ? (data.remaining < 0 ? "expense" : "primary") : "hero"} label={`${data.total ? Math.round((data.spent / data.total) * 100) : 0}% do orçamento usado`} />
      <span className={cx("flex justify-between gap-3 text-[13px]", desktop ? "text-muted" : "text-on-hero-muted")}>
        <span>Gasto: {formatMoney(data.spent)}</span>
        <span>Limite: {formatMoney(data.total)}</span>
      </span>
      {desktop && (
        <p className="text-[13px] text-muted">
          {over.length
            ? `${over[0].categoryId ? category(over[0].categoryId)?.name : GENERAL_NAME} passou ${formatMoney(over[0].spent - (over[0].limit ?? 0))} do limite. Considere ajustar ou mover de outra categoria.`
            : `Orçamento variável: ${formatMoney(data.variable)} (sem as recorrentes fixas de ${formatMoney(data.fixed)}).`}
        </p>
      )}
    </Card>
  );

  if (!desktop) {
    const withLimit = data.categories.filter((row) => row.limit !== null);
    const withoutLimit = data.categories.filter((row) => row.limit === null && row.spent > 0);
    return (
      <>
        {header}
        {summaryCard}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Por categoria</h2>
          <Button variant="link" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing(true)}>
            Definir limites
          </Button>
        </div>
        <ul className="flex flex-col gap-4">
          {withLimit.map((row) => (
            <LimitRow key={rowKey(row.categoryId)} row={row} category={category} />
          ))}
        </ul>
        {withoutLimit.length > 0 && (
          <section aria-label="Sem limite" className="flex flex-col gap-2">
            <h2 className="text-[13px] font-semibold text-muted">Sem limite</h2>
            <ul>
              {withoutLimit.map((row) => (
                <li key={rowKey(row.categoryId)} className="flex min-h-12 items-center justify-between gap-3">
                  <span className="text-[15px]">{category(row.categoryId)?.name ?? "Sem categoria"}</span>
                  <Money value={row.spent} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        )}
        <EditorSheet open={editing} title={`Limites de ${name}`} onClose={() => setEditing(false)} onSave={submit} saving={save.isPending}>
          {editor}
        </EditorSheet>
      </>
    );
  }

  const head = "py-3 text-left text-xs font-semibold uppercase tracking-[.04em] text-muted";
  return (
    <>
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader title="Limites por categoria" action={<span className="text-[13px] text-muted">Edite o limite direto na linha</span>} />
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className={head}>Categoria</th>
                <th scope="col" className={head}>Progresso</th>
                <th scope="col" className={cx(head, "text-right")}>Gasto</th>
                <th scope="col" className={cx(head, "w-44 pl-4")}>Limite</th>
              </tr>
            </thead>
            <tbody>
              {editable.map((row) => {
                const cat = category(row.categoryId);
                const limit = draft.values[rowKey(row.categoryId)]?.value ?? null;
                return (
                  <tr key={rowKey(row.categoryId)} className="border-b border-border">
                    <th scope="row" className="py-2 pr-3 text-left text-[15px] font-semibold">
                      <span className="flex items-center gap-2.5">
                        <CategoryIcon category={cat} className="!size-9" />
                        {cat?.name ?? GENERAL_NAME}
                      </span>
                    </th>
                    <td className="w-48 py-2 pr-3">
                      <UsageBar spent={row.spent} limit={limit && limit > 0 ? limit : null} />
                    </td>
                    <td className="py-2 text-right">
                      <Money value={row.spent} size="sm" />
                    </td>
                    <td className="py-2 pl-4">
                      <LimitInput label={`Limite de ${cat?.name ?? GENERAL_NAME}`} text={draft.values[rowKey(row.categoryId)]?.text} onChange={(text, value) => draft.set(row.categoryId, text, value)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[15px] font-semibold">Total dos limites: {formatMoney(draft.total)}</span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-3 text-sm">
                <Toggle checked={repeat} onChange={setRepeat} label="Repetir nos próximos meses" />
                {repeat ? `Vale de ${name} em diante` : `Só em ${name}`}
              </span>
              <Button loading={save.isPending} disabled={!draft.dirty && data.hasBudget} onClick={submit}>
                Salvar limites
              </Button>
            </div>
          </div>
        </Card>
        {summaryCard}
      </div>
    </>
  );
}

function UsageBar({ spent, limit }: { spent: number; limit: number | null }) {
  if (limit === null) return <span className="text-[13px] text-muted">Sem limite</span>;
  const over = spent > limit;
  return (
    <div className="flex flex-col gap-1">
      <ProgressBar value={spent} max={limit} tone={over ? "expense" : "primary"} label={over ? `${formatMoney(spent - limit)} acima do limite` : `${Math.round((spent / limit) * 100)}% usado`} />
      <span className={cx("text-xs font-semibold", over ? "text-expense" : "text-muted")}>
        {over ? `${formatMoney(spent - limit)} acima do limite` : `${Math.round((spent / limit) * 100)}% usado`}
      </span>
    </div>
  );
}

function LimitRow({ row, category }: { row: CategoryBudget; category: CategoryLookup }) {
  const limit = row.limit ?? 0;
  const over = row.spent > limit;
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">{row.categoryId ? category(row.categoryId)?.name ?? "Sem categoria" : GENERAL_NAME}</span>
        <span className={cx("text-[13px]", over ? "font-semibold text-expense" : "text-muted")}>
          {over ? `${formatMoney(row.spent - limit)} acima do limite` : `${formatMoney(row.spent)} de ${formatMoney(limit)}`}
        </span>
      </div>
      <ProgressBar value={row.spent} max={limit || 1} tone={over ? "expense" : "primary"} label={over ? "Acima do limite" : `${Math.round((row.spent / (limit || 1)) * 100)}% usado`} />
      {over && <span className="text-[13px] text-muted">{formatMoney(row.spent)} de {formatMoney(limit)}</span>}
    </li>
  );
}

function EditorSheet({ open, title, onClose, onSave, saving, children }: { open: boolean; title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      mobile="full"
      dismissible={!saving}
      footer={
        <Button size="lg" block loading={saving} onClick={onSave}>
          Salvar limites
        </Button>
      }
    >
      {children}
    </Sheet>
  );
}
