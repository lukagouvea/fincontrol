import { useMemo, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useCategories, useDeleteCategory, useMergeCategory, useUpdateCategory } from "../hooks/useCategories";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useSelectedMonth } from "../app/MonthContext";
import { usePendingDeletes } from "../app/PendingDeletes";
import { useMonthLedger } from "../features/useLedger";
import { useToast } from "../ui/Toast";
import { summarizeLedger, type EntryType } from "../features/ledger";
import { CategorySheet, type CategorySheetState, type DeleteChoice } from "../features/categories/CategorySheet";
import type { Category } from "../types/FinanceTypes";
import { monthNames } from "../lib/dates";
import { formatMoney } from "../lib/money";
import { cx } from "../lib/cx";
import { Button, IconButton } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { MonthSwitcher } from "../ui/MonthSwitcher";
import { PageHeader } from "../ui/PageHeader";
import { Segmented } from "../ui/Segmented";
import { LoadingCard } from "../ui/Skeleton";
import { CategoryIcon } from "../ui/CategoryIcon";

export function Categories() {
  const { month, year, setMonth } = useSelectedMonth();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const categoriesQuery = useCategories();
  const ledger = useMonthLedger(month, year);
  const archive = useDeleteCategory();
  const merge = useMergeCategory();
  const restore = useUpdateCategory();
  const showToast = useToast();
  const [showArchived, setShowArchived] = useState(false);
  const { hidden, scheduleDelete } = usePendingDeletes();
  const [type, setType] = useState<EntryType>("expense");
  const [sheet, setSheet] = useState<CategorySheetState | null>(null);
  const name = monthNames[month].toLowerCase();

  const totals = useMemo(() => {
    const summary = summarizeLedger(ledger.entries);
    const list = type === "expense" ? summary.expenseByCategory : summary.incomeByCategory;
    return new Map(list.map((item) => [item.categoryId, item]));
  }, [ledger.entries, type]);

  const list = (categoriesQuery.data ?? [])
    .filter((category) => category.type === type && category.active !== false && !hidden.has(`cat:${category.id}`))
    .sort((a, b) => (totals.get(b.id)?.total ?? 0) - (totals.get(a.id)?.total ?? 0) || a.name.localeCompare(b.name, "pt-BR"));

  const deleteCategory = (category: Category, choice: DeleteChoice) => {
    setSheet(null);
    const target = choice.mode === "merge" ? (categoriesQuery.data ?? []).find((item) => item.id === choice.targetId) : undefined;
    scheduleDelete({
      keys: [`cat:${category.id}`],
      message: target ? `“${category.name}” mesclada em ${target.name}` : `“${category.name}” arquivada`,
      commit: () =>
        choice.mode === "merge" ? merge.mutateAsync({ id: category.id, targetId: choice.targetId }) : archive.mutateAsync(category.id),
    });
  };

  const archived = (categoriesQuery.data ?? [])
    .filter((category) => category.type === type && category.active === false)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const restoreCategory = async (category: Category) => {
    try {
      await restore.mutateAsync({ id: category.id, data: { active: true } });
      showToast({ message: `“${category.name}” restaurada` });
    } catch {
      showToast({ message: "Não foi possível restaurar a categoria." });
    }
  };

  const describe = (category: Category) => {
    const total = totals.get(category.id);
    if (!total) return `Sem lançamentos em ${name}`;
    return `${total.count} ${total.count === 1 ? "lançamento" : "lançamentos"} em ${name}`;
  };

  return (
    <>
      <PageHeader
        back="/ajustes"
        title="Categorias"
        eyebrow={<span className="hidden lg:inline">Organize seus gastos</span>}
        actions={
          <>
            {desktop && <MonthSwitcher month={month} year={year} onChange={setMonth} />}
            {desktop ? (
              <Button icon={<Plus size={18} aria-hidden="true" />} onClick={() => setSheet({ kind: "create", type })}>
                Nova categoria
              </Button>
            ) : (
              <IconButton label="Nova categoria" onClick={() => setSheet({ kind: "create", type })} className="!border-primary !bg-primary !text-on-primary">
                <Plus size={22} aria-hidden="true" />
              </IconButton>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className={cx("flex min-w-0 flex-col gap-4", desktop && "rounded-card border border-border bg-surface p-5")}>
          <Segmented
            label="Tipo de categoria"
            value={type}
            onChange={setType}
            className="lg:max-w-xs"
            options={[
              { value: "expense", label: "Despesas" },
              { value: "income", label: "Receitas" },
            ]}
          />
          {categoriesQuery.isPending ? (
            <LoadingCard label="Carregando categorias…" rows={5} />
          ) : categoriesQuery.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-expense-tint p-4 text-expense">
              <p className="text-[15px] font-semibold">Não foi possível carregar as categorias.</p>
              <Button variant="secondary" onClick={() => categoriesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : !list.length ? (
            <EmptyState
              title={type === "expense" ? "Nenhuma categoria de despesa" : "Nenhuma categoria de receita"}
              description="Categorias organizam seus lançamentos e os relatórios."
              action={
                <Button size="lg" icon={<Plus size={18} aria-hidden="true" />} onClick={() => setSheet({ kind: "create", type })}>
                  Criar categoria
                </Button>
              }
            />
          ) : (
            <ul aria-label={type === "expense" ? "Categorias de despesa" : "Categorias de receita"}>
              {list.map((category) => (
                <li key={category.id} className="border-b border-border last:border-b-0 lg:border-b">
                  <button
                    type="button"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => setSheet({ kind: "edit", category })}
                    className="-mx-2 flex min-h-16 w-[calc(100%+16px)] items-center gap-3 rounded-tile px-2 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <CategoryIcon category={category} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{category.name}</span>
                      <span className="block truncate text-[13px] text-muted">{describe(category)}</span>
                    </span>
                    {desktop && (
                      <Money value={totals.get(category.id)?.total ?? 0} size="sm" className={totals.get(category.id) ? "" : "text-muted"} />
                    )}
                    <ChevronRight size={18} aria-hidden="true" className="text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {archived.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border pt-2">
              <Button variant="link" className="self-start" aria-expanded={showArchived} onClick={() => setShowArchived((value) => !value)}>
                Arquivadas ({archived.length})
              </Button>
              {showArchived && (
                <ul aria-label="Categorias arquivadas">
                  {archived.map((category) => (
                    <li key={category.id} className="flex min-h-14 items-center gap-3">
                      <CategoryIcon category={category} className="opacity-60" />
                      <span className="flex-1 text-[15px] text-muted">{category.name}</span>
                      <Button
                        variant="secondary"
                        loading={restore.isPending && restore.variables?.id === category.id}
                        onClick={() => restoreCategory(category)}
                        aria-label={`Restaurar ${category.name}`}
                      >
                        Restaurar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Card className="hidden lg:flex">
          <CardHeader title="Ao apagar uma categoria" />
          <p className="rounded-2xl bg-primary-tint p-4 text-[15px] text-ink">
            <strong>Mesclar em outra</strong> (recomendado): o histórico continua somando nos relatórios, dentro da categoria escolhida.
          </p>
          <p className="rounded-2xl bg-surface-2 p-4 text-[15px] text-ink">
            <strong>Arquivar</strong>: some das listas novas, mas mantém o histórico com o mesmo nome.
          </p>
          <p className="text-[13px] text-muted">Você pode desfazer por alguns segundos.</p>
          <p className="text-[13px] text-muted">
            Total de {type === "expense" ? "gastos" : "receitas"} em {name}:{" "}
            {formatMoney([...totals.values()].reduce((sum, item) => sum + item.total, 0))}
          </p>
        </Card>
      </div>

      <CategorySheet state={sheet} onClose={() => setSheet(null)} onDelete={deleteCategory} monthCount={(id) => totals.get(id)?.count ?? 0} />
    </>
  );
}
