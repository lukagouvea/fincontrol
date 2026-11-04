import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, CalendarDays, Archive, CircleStop } from "lucide-react";
import { fixedTransactionService } from "../../services/fixedTransactionService";
import { useCategories } from "../../hooks/useCategories";
import {
  useMonthlyVariations,
  useAddMonthlyVariation,
  useDeleteMonthlyVariation,
} from "../../hooks/useMonthlyVariations";
import { getActualFixedItemAmount } from "../../utils/financeUtils";
import {
  formatUTCToDDMMAAAA,
  convertDateToUTCISOString,
  parseDateInputToLocal,
} from "../../utils/dateUtils";
import type { FixedTransaction } from "../../types/FinanceTypes";
import { TransactionForm, type TransactionFormValues } from "./TransactionForm";
import { ConfirmationModal } from "./ConfirmationModal";
import { VariationModal } from "./VariationModal";
import {
  Button,
  CategoryLabel,
  EmptyState,
  ErrorState,
  LoadingState,
  Money,
  formatMoney,
} from "./UI";

export function FixedTransactions({ type }: { type: "income" | "expense" }) {
  const client = useQueryClient();
  const income = type === "income";
  const key = income ? "fixed-incomes" : "fixed-expenses";
  const query = useQuery({
    queryKey: [key],
    queryFn: income
      ? fixedTransactionService.getIncomes
      : fixedTransactionService.getExpenses,
    staleTime: 300000,
  });
  const categories = useCategories();
  const variations = useMonthlyVariations();
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedTransaction | null>(null);
  const [deleting, setDeleting] = useState<FixedTransaction | null>(null);
  const [varying, setVarying] = useState<FixedTransaction | null>(null);
  const invalidate = () => client.invalidateQueries({ queryKey: [key] });
  const save = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const values = {
        description: data.description,
        amount: data.amount,
        categoryId: data.categoryId,
        type,
        day: data.day,
        startDate: convertDateToUTCISOString(
          parseDateInputToLocal(data.startDate),
        ),
        endDate: data.endDate
          ? convertDateToUTCISOString(parseDateInputToLocal(data.endDate))
          : null,
      };
      if (editing)
        return (
          income
            ? fixedTransactionService.updateIncome
            : fixedTransactionService.updateExpense
        )(editing.id, values);
      return (
        income
          ? fixedTransactionService.createIncome
          : fixedTransactionService.createExpense
      )(values);
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: income
      ? fixedTransactionService.deleteIncome
      : fixedTransactionService.deleteExpense,
    onSuccess: invalidate,
  });
  const addVariation = useAddMonthlyVariation();
  const deleteVariation = useDeleteMonthlyVariation();
  const now = new Date();
  const all = query.data || [];
  const isArchived = (item: FixedTransaction) =>
    !!item.endDate && new Date(item.endDate) <= now;
  const items = all.filter((item) => isArchived(item) === archived);
  const archivedCount = all.filter(isArchived).length;
  const label = income ? "receita" : "despesa";
  const error = query.isError || categories.isError || variations.isError;
  const retry = () => {
    void query.refetch();
    void categories.refetch();
    void variations.refetch();
  };
  const addNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const submitVariation = async (data: {
    year: number;
    month: number;
    amount: number;
  }) => {
    if (!varying) return;
    const existing = variations.data?.find(
      (v) =>
        v.fixedItemId === varying.id &&
        v.type === type &&
        v.year === data.year &&
        v.month === data.month,
    );
    if (data.amount === varying.amount) {
      if (existing) await deleteVariation.mutateAsync(existing.id);
    } else
      await addVariation.mutateAsync({
        ...data,
        fixedItemId: varying.id,
        type,
      });
    setVarying(null);
  };
  return (
    <div className="page-stack">
      <div className="list-toolbar">
        <Button
          variant={archived ? "primary" : "secondary"}
          onClick={() => setArchived((v) => !v)}
        >
          <Archive />
          {archived ? "Ver ativas" : "Arquivadas (" + archivedCount + ")"}
        </Button>
        <Button
          onClick={addNew}
          className="list-add-button"
          aria-label={`Nova ${label} fixa`}
        >
          <Plus />
          <span className="list-add-label">Nova {label} fixa</span>
        </Button>
      </div>
      <div className="list-caption">
        <span>
          {archived
            ? "Compromissos encerrados"
            : "Compromissos recorrentes ativos"}
        </span>
        <span>
          {error
            ? "Dados indisponíveis"
            : query.isLoading || categories.isLoading || variations.isLoading
              ? "Carregando…"
              : items.length +
                (items.length === 1 ? " registro" : " registros")}
        </span>
      </div>
      {error ? (
        <ErrorState retry={retry} />
      ) : query.isLoading || categories.isLoading || variations.isLoading ? (
        <LoadingState />
      ) : items.length ? (
        <div className="table-panel">
          <table className="data-table fixed-table">
            <caption className="sr-only">
              {income ? "Receitas fixas" : "Despesas fixas"}
            </caption>
            <thead>
              <tr>
                {["Descrição", "Valor atual", "Dia", "Detalhes", "Ações"].map(
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
                const current = getActualFixedItemAmount(
                  item.id,
                  type,
                  now.getFullYear(),
                  now.getMonth(),
                  item.amount,
                  variations.data || [],
                );
                const category = categories.data?.find(
                  (c) => c.id === item.categoryId,
                );
                return (
                  <tr key={item.id}>
                    <td className="row-title">
                      {item.description}
                      <div>
                        <CategoryLabel
                          name={category?.name}
                          color={category?.color}
                        />
                      </div>
                    </td>
                    <td data-label={archived ? "Valor padrão" : "Valor atual"}>
                      <Money
                        value={archived ? item.amount : current}
                        type={type}
                      />
                      {!archived && current !== item.amount && (
                        <p className="small subtle">Variação neste mês</p>
                      )}
                    </td>
                    <td data-label={income ? "Recebimento" : "Vencimento"}>
                      Dia {item.day}
                    </td>
                    <td className="fixed-details">
                      <details>
                        <summary>Detalhes da recorrência</summary>
                        <dl>
                          <div>
                            <dt>Valor padrão</dt>
                            <dd>{formatMoney(item.amount)}</dd>
                          </div>
                          <div>
                            <dt>Vigência</dt>
                            <dd>
                              {formatUTCToDDMMAAAA(item.startDate)}{" "}
                              {item.endDate
                                ? "até " + formatUTCToDDMMAAAA(item.endDate)
                                : "· contínua"}
                            </dd>
                          </div>
                          <div>
                            <dt>Variações registradas</dt>
                            <dd>
                              {variations.data?.filter(
                                (v) =>
                                  v.fixedItemId === item.id && v.type === type,
                              ).length || 0}
                            </dd>
                          </div>
                        </dl>
                      </details>
                    </td>
                    <td className="actions-cell">
                      <div>
                        {!archived && (
                          <button
                            className="icon-button"
                            aria-label={
                              "Variação mensal de " + item.description
                            }
                            onClick={() => setVarying(item)}
                          >
                            <CalendarDays size={17} />
                          </button>
                        )}
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
                        {!archived && (
                          <button
                            className="icon-button"
                            aria-label={"Encerrar " + item.description}
                            onClick={() => setDeleting(item)}
                          >
                            <CircleStop size={17} />
                          </button>
                        )}
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
          title={
            archived
              ? "Nenhum registro arquivado"
              : "Nenhuma " + label + " fixa cadastrada"
          }
          description={
            archived
              ? "Os compromissos encerrados ficam disponíveis aqui."
              : "Cadastre os valores que se repetem todos os meses."
          }
          action={
            !archived && (
              <Button variant="secondary" onClick={addNew}>
                Adicionar {label} fixa
              </Button>
            )
          }
        />
      )}
      <TransactionForm
        recurring
        kind={type}
        isOpen={open}
        onClose={() => setOpen(false)}
        initialData={editing}
        onSubmit={async (values) => {
          await save.mutateAsync(values);
          setOpen(false);
        }}
        isLoading={save.isPending}
      />
      <ConfirmationModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        title={"Encerrar " + label + " fixa?"}
        message="A partir de hoje, este compromisso não será mais lançado. Os registros anteriores serão preservados."
        confirmationMessage="Encerrar"
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
      {varying && (
        <VariationModal
          isOpen
          onClose={() => setVarying(null)}
          onSubmit={submitVariation}
          itemDescription={varying.description}
          defaultAmount={varying.amount}
          existingVariations={(variations.data || []).filter(
            (v) => v.fixedItemId === varying.id && v.type === type,
          )}
          formatValue={formatMoney}
          formatMonthYear={(m, y) =>
            new Date(y, m, 1).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })
          }
        />
      )}
    </div>
  );
}
