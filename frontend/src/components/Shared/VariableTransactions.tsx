import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useTransactions,
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useAddCompraParcelada,
} from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import type { Transaction, VariableExpense } from "../../types/FinanceTypes";
import {
  convertDateToUTCISOString,
  parseDateInputToLocal,
  formatUTCToDDMMAAAA,
} from "../../utils/dateUtils";
import { TransactionForm, type TransactionFormValues } from "./TransactionForm";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  Button,
  CategoryLabel,
  EmptyState,
  ErrorState,
  LoadingState,
  Money,
  MonthPicker,
  formatMoney,
} from "./UI";

export function VariableTransactions({ type }: { type: "income" | "expense" }) {
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const rawMonth = Number(params.get("mes"));
  const rawYear = Number(params.get("ano"));
  const month = rawMonth >= 1 && rawMonth <= 12 ? rawMonth - 1 : now.getMonth();
  const year = rawYear >= 1900 && rawYear <= 2200 ? rawYear : now.getFullYear();
  const query = useTransactions(month, year);
  const categories = useCategories();
  const create = useAddTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const installment = useAddCompraParcelada();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const items = (query.data || [])
    .filter((t) => {
      const d = parseDateInputToLocal(t.date.split("T")[0]);
      return (
        t.type === type &&
        !t.recurringRuleId &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const label = type === "income" ? "receita" : "despesa";
  const addNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const submit = async (data: TransactionFormValues) => {
    const values = {
      description: data.description,
      amount: data.amount,
      categoryId: data.categoryId,
      date: convertDateToUTCISOString(parseDateInputToLocal(data.date)),
      type,
    };
    if (editing) await update.mutateAsync({ id: editing.id, data: values });
    else if (type === "expense" && data.isInstallment)
      await installment.mutateAsync({
        ...values,
        numParcelas: data.installmentCount,
      });
    else await create.mutateAsync(values);
    setOpen(false);
  };
  const error = query.isError || categories.isError;
  const loading =
    query.isLoading || query.isPlaceholderData || categories.isLoading;
  return (
    <div className="page-stack">
      <div className="list-toolbar">
        <MonthPicker
          month={month}
          year={year}
          onChange={(m, y) => {
            const next = new URLSearchParams(params);
            next.set("mes", String(m + 1));
            next.set("ano", String(y));
            setParams(next);
          }}
        />
        <Button
          onClick={addNew}
          className="list-add-button"
          aria-label={`Nova ${label}`}
        >
          <Plus />
          <span className="list-add-label">Nova {label}</span>
        </Button>
      </div>
      <div className="list-caption">
        <span>
          {error
            ? "Dados indisponíveis"
            : loading
              ? "Consultando período…"
              : items.length +
                (items.length === 1
                  ? " lançamento no período"
                  : " lançamentos no período")}
        </span>
        {!loading && !error && (
          <span>
            Total{" "}
            <strong>
              {formatMoney(items.reduce((sum, item) => sum + item.amount, 0))}
            </strong>
          </span>
        )}
      </div>
      {error ? (
        <ErrorState
          retry={() => {
            void query.refetch();
            void categories.refetch();
          }}
        />
      ) : loading ? (
        <LoadingState />
      ) : items.length ? (
        <div className="table-panel">
          <table className="data-table variable-table">
            <caption className="sr-only">
              {type === "income" ? "Receitas variáveis" : "Despesas variáveis"}
            </caption>
            <thead>
              <tr>
                {["Descrição", "Data", "Categoria", "Valor", "Ações"].map(
                  (h) => (
                    <th scope="col" key={h}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const category = categories.data?.find(
                  (c) => c.id === item.categoryId,
                );
                const info = (item as VariableExpense).installmentInfo;
                return (
                  <tr key={item.id}>
                    <td className="row-title">
                      {item.description}
                      {info && (
                        <p className="small subtle">
                          Parcela {info.current} de {info.total}
                        </p>
                      )}
                    </td>
                    <td data-label="Data">{formatUTCToDDMMAAAA(item.date)}</td>
                    <td data-label="Categoria">
                      <CategoryLabel
                        name={category?.name}
                        color={category?.color}
                      />
                    </td>
                    <td data-label="Valor">
                      <Money value={item.amount} type={type} />
                    </td>
                    <td className="actions-cell">
                      <div>
                        <button
                          className="icon-button"
                          aria-label={"Editar " + item.description}
                          onClick={() => {
                            setEditing(item);
                            setOpen(true);
                          }}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Excluir " + item.description}
                          onClick={() => setDeleting(item)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={"Nenhuma " + label + " neste período"}
          description="Seus lançamentos aparecerão aqui conforme você registrar as movimentações."
          action={
            <Button variant="secondary" onClick={addNew}>
              Adicionar {label}
            </Button>
          }
        />
      )}
      <TransactionForm
        kind={type}
        isOpen={open}
        onClose={() => setOpen(false)}
        initialData={editing}
        onSubmit={submit}
        isLoading={
          create.isPending || update.isPending || installment.isPending
        }
      />
      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        title={"Excluir " + label + "?"}
        message={
          (deleting as VariableExpense | null)?.installmentInfo
            ? "Todas as parcelas desta compra serão excluídas. Essa ação não pode ser desfeita."
            : "Este lançamento será excluído. Essa ação não pode ser desfeita."
        }
        confirmationMessage="Excluir"
      />
    </div>
  );
}
