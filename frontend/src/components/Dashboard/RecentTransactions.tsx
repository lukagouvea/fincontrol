import { useId, useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import type {
  Transaction,
  Category,
  VariableExpense,
} from "../../types/FinanceTypes";
import { formatUTCToDDMMAAAA } from "../../utils/dateUtils";
import { Button, CategoryLabel, EmptyState, Money } from "../Shared/UI";

export function RecentTransactions({
  transactions,
  categories,
  date,
}: {
  transactions: Transaction[];
  categories: Category[];
  date: Date;
}) {
  const compact = useMediaQuery("(max-width: 767px)");
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  // Preserve main's expense-only universe, including installments.
  const items = transactions
    .filter(
      (t) =>
        ("isInstallment" in t || "installmentInfo" in t) &&
        new Date(t.date).getFullYear() === date.getFullYear() &&
        new Date(t.date).getMonth() === date.getMonth(),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  if (!items.length)
    return (
      <EmptyState
        title="Nenhuma despesa por aqui"
        description="Seus gastos recentes aparecerão nesta lista."
      />
    );
  return (
    <>
      <table className="data-table variable-table">
        <caption className="sr-only">Despesas recentes</caption>
        <thead>
          <tr>
            {["Descrição", "Data", "Categoria", "Valor"].map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id={id}>
          {(compact && !expanded ? items.slice(0, 3) : items).map((item) => {
            const category = categories.find((c) => c.id === item.categoryId);
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
                <td>
                  <CategoryLabel
                    name={category?.name}
                    color={category?.color}
                  />
                </td>
                <td>
                  <Money value={item.amount} type={item.type} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {compact && items.length > 3 && (
        <Button
          variant="ghost"
          className="list-disclosure"
          aria-controls={id}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Recolher despesas recentes"
              : "Mostrar todas as despesas recentes"
          }
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Mostrar menos" : `Ver mais ${items.length - 3} despesas`}
        </Button>
      )}
    </>
  );
}
