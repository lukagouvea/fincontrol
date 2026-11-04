import { useMediaQuery } from "../../hooks/useMediaQuery";
import React from "react";
import { CategoryLabel, EmptyState, Money } from "../Shared/UI";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getActualFixedItemAmount } from "../../utils/financeUtils";
import {
  Transaction,
  Category,
  MonthlyVariation,
} from "../../types/FinanceTypes";
type CategoryPieChartProps = {
  transactions: Transaction[];
  categories: Category[];
  monthlyVariations: MonthlyVariation[];
  date: Date;
};
export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  transactions,
  categories,
  monthlyVariations,
  date,
}) => {
  const compact = useMediaQuery("(max-width: 767px)");
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface dark:bg-surface border border-line dark:border-line p-2 shadow-md rounded">
          <p className="text-blue-500">
            {payload[0].name} :{" "}
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(payload[0].value))}
          </p>
        </div>
      );
    }
    return null;
  };

  // getMonth() retorna o mês de 0 (Janeiro) a 11 (Dezembro), por isso somamos 1.
  const anoAtual = date.getFullYear(); // Ex: 2025
  const mesAtual = date.getMonth() + 1; // Ex: Para Outubro, retorna 10

  // padStart(2, '0') garante que o mês tenha sempre dois dígitos. Ex: 9 vira "09", 10 continua "10".
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`; // Ex: "2025-10"

  // Filtrar apenas despesas
  const expenses = transactions
    .filter(
      (t) =>
        !t.recurringRuleId &&
        t.type == "expense" &&
        t.date.startsWith(anoMesAtualString),
    )
    .map((expense) => ({
      ...expense,
      amount: !expense.recurringRuleId
        ? expense.amount
        : getActualFixedItemAmount(
            expense.id,
            "expense",
            anoAtual,
            mesAtual - 1,
            expense.amount,
            monthlyVariations,
          ),
    }));
  // Calcular o total por categoria
  const categoryTotals = categories
    .filter((cat) => cat.type === "expense")
    .map((category) => {
      const total = expenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        id: category.id,
        name: category.name,
        value: total,
        color: category.color || "#888888",
      };
    })
    .filter((item) => item.value > 0);
  // Ordenar por valor (do maior para o menor)
  categoryTotals.sort((a, b) => b.value - a.value);
  if (!categoryTotals.length)
    return <EmptyState title="Nenhuma despesa registrada" />;
  return (
    <div>
      {!compact && (
        <div className="h-48" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryTotals}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={78}
                innerRadius={53}
                stroke="none"
                dataKey="value"
              >
                {categoryTotals.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className="category-legend" aria-label="Valores por categoria">
        {categoryTotals.map((entry) => (
          <li key={entry.id}>
            <CategoryLabel name={entry.name} color={entry.color} />
            <Money value={entry.value} />
          </li>
        ))}
      </ul>
    </div>
  );
};
