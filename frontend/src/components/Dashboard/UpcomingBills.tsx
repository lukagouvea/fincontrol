import { useMediaQuery } from "../../hooks/useMediaQuery";
import React, { useMemo } from "react";
import { EmptyState, Money } from "../Shared/UI";
// 1. Importe os ícones necessários
import { CreditCard, ArrowDownCircle } from "lucide-react";
import {
  isItemActiveInMonth,
  getActualFixedItemAmount,
} from "../../utils/financeUtils";
import {
  FixedExpense,
  Transaction,
  MonthlyVariation,
} from "../../types/FinanceTypes";

type UpcomingBill = {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Apenas o dia do mês
  type: "fixed" | "installment"; // 2. Adicione o tipo aqui
};

type UpcomingBillsProps = {
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  monthlyVariations: MonthlyVariation[];
  date: Date; // O objeto Date do mês selecionado
};

export const UpcomingBills: React.FC<UpcomingBillsProps> = ({
  fixedExpenses,
  transactions,
  monthlyVariations,
  date,
}) => {
  const previewCount = useMediaQuery("(max-width: 767px)") ? 3 : 5;
  const { upcomingBills, totalAmount } = useMemo(() => {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    // Pega as despesas fixas ativas para o mês
    const activeFixedExpenses: UpcomingBill[] = fixedExpenses
      .filter((expense) => isItemActiveInMonth(expense, date))
      .map((expense) => ({
        id: `fixed-${expense.id}`,
        description: expense.description,
        // Importante: usar o valor real do mês (pode haver variação mensal)
        amount: getActualFixedItemAmount(
          expense.id,
          "expense",
          currentYear,
          currentMonth,
          expense.amount,
          monthlyVariations,
        ),
        dueDate: expense.day,
        type: "fixed", // Adiciona o tipo 'fixed'
      }));

    // Pega as parcelas que vencem no mês
    const monthlyInstallments: UpcomingBill[] = transactions
      .filter((t) => {
        if (!("installmentInfo" in t) || !t.installmentInfo) {
          return false;
        }
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: new Date(t.date).getDate(),
        type: "installment", // Adiciona o tipo 'installment'
      }));

    // Combina e ordena por data de vencimento
    const allBills = [...activeFixedExpenses, ...monthlyInstallments].sort(
      (a, b) => a.dueDate - b.dueDate,
    );

    // Calcula o total
    const total = allBills.reduce((sum, bill) => sum + bill.amount, 0);

    return { upcomingBills: allBills, totalAmount: total };
  }, [fixedExpenses, transactions, date, monthlyVariations]);

  const getDueDateText = (dueDate: number) => {
    const today = new Date();
    const dueDateThisMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      dueDate,
    );

    if (
      today.getMonth() === date.getMonth() &&
      today.getFullYear() === date.getFullYear()
    ) {
      const diffTime = dueDateThisMonth.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return <span className="text-negative">Vencido</span>;
      if (diffDays === 0)
        return <span className="text-warning">Vence hoje</span>;
      if (diffDays === 1) return `Vence amanhã`;
      return `Vence em ${diffDays} dias`;
    }

    return `Vencimento dia ${dueDate}`;
  };

  const renderBill = (bill: UpcomingBill) => (
    <li key={bill.id} className="bill-row">
      <span className="bill-icon" aria-hidden="true">
        {bill.type === "installment" ? (
          <CreditCard size={17} />
        ) : (
          <ArrowDownCircle size={17} />
        )}
      </span>
      <div>
        <strong>{bill.description}</strong>
        <p>
          {getDueDateText(bill.dueDate)}
          {bill.type === "installment" ? " · Parcela" : ""}
        </p>
      </div>
      <Money value={bill.amount} />
    </li>
  );
  if (!upcomingBills.length)
    return (
      <EmptyState
        title="Nenhuma conta neste mês"
        description="Seus compromissos fixos e parcelas aparecerão aqui."
      />
    );
  return (
    <div>
      <ul className="bills-list">
        {upcomingBills.slice(0, previewCount).map(renderBill)}
      </ul>
      {upcomingBills.length > previewCount && (
        <details className="bills-more">
          <summary>
            Ver mais {upcomingBills.length - previewCount} contas
          </summary>
          <ul>{upcomingBills.slice(previewCount).map(renderBill)}</ul>
        </details>
      )}
      <div className="bills-total">
        <span>Total de compromissos</span>
        <Money value={totalAmount} />
      </div>
    </div>
  );
};
