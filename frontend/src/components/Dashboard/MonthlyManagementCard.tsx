import React, { useMemo } from "react";
import {
  FixedExpense,
  MonthlyVariation,
  Transaction,
} from "../../types/FinanceTypes";
import {
  getActualFixedItemAmount,
  isItemActiveInMonth,
} from "../../utils/financeUtils";

type MonthlyManagementCardProps = {
  date: Date;
  monthlyIncome: number;
  fixedExpenses: FixedExpense[];
  monthlyVariations: MonthlyVariation[];
  transactions: Transaction[]; // deve incluir parceladas
  investmentMonthlyAmount: number; // configurado pelo usuário (UI/localStorage)
  compact?: boolean; // modo compacto para Relatório Mensal
};

type MonthlyManagementComputedProps = {
  committedTotal: number;
  remainingAfterInvestment: number;
  perDay: number;
  perWeek: number;
  investmentMonthlyAmount: number;
  compact?: boolean;
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

const getDaysInMonth = (date: Date) => {
  // último dia do mês: dia 0 do mês seguinte
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const MonthlyManagementCardViewComponent: React.FC<
  MonthlyManagementComputedProps
> = ({
  remainingAfterInvestment,
  perDay,
  perWeek,
  investmentMonthlyAmount,
  compact = false,
}) => {
  const negativeClass = (value: number) =>
    value < 0 ? "text-negative" : "text-blue-600";

  return (
    <div
      className={
        compact ? "management-flow management-compact" : "management-flow"
      }
    >
      <dl>
        <div>
          <dt>Investimento reservado</dt>
          <dd>{formatBRL(investmentMonthlyAmount)}</dd>
        </div>
        <div>
          <dt>Orçamento planejado</dt>
          <dd className={negativeClass(remainingAfterInvestment)}>
            {formatBRL(remainingAfterInvestment)}
          </dd>
        </div>
      </dl>
      <div className="budget-periods">
        <div>
          <span>Por dia</span>
          <strong className={negativeClass(perDay)}>{formatBRL(perDay)}</strong>
        </div>
        <div>
          <span>Por semana</span>
          <strong className={negativeClass(perWeek)}>
            {formatBRL(perWeek)}
          </strong>
        </div>
      </div>
    </div>
  );
};

export const MonthlyManagementCardView = React.memo(
  MonthlyManagementCardViewComponent,
  (prev, next) => {
    return (
      prev.compact === next.compact &&
      prev.investmentMonthlyAmount === next.investmentMonthlyAmount &&
      prev.remainingAfterInvestment === next.remainingAfterInvestment &&
      prev.perDay === next.perDay &&
      prev.perWeek === next.perWeek &&
      prev.committedTotal === next.committedTotal
    );
  },
);

MonthlyManagementCardView.displayName = "MonthlyManagementCardView";

const MonthlyManagementCardComponent: React.FC<MonthlyManagementCardProps> = ({
  date,
  monthlyIncome,
  fixedExpenses,
  monthlyVariations,
  transactions,
  investmentMonthlyAmount,
  compact = false,
}) => {
  const { committedTotal, remainingAfterInvestment, perDay, perWeek } =
    useMemo(() => {
      const year = date.getFullYear();
      const month = date.getMonth();

      const committedFixed = fixedExpenses
        .filter((expense) => isItemActiveInMonth(expense, date))
        .reduce(
          (sum, expense) =>
            sum +
            getActualFixedItemAmount(
              expense.id,
              "expense",
              year,
              month,
              expense.amount,
              monthlyVariations,
            ),
          0,
        );

      const committedInstallmentsValue = transactions
        .filter((t) => "installmentInfo" in t && !!t.installmentInfo)
        .filter((t) => {
          const d = new Date(t.date);
          return d.getFullYear() === year && d.getMonth() === month;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const committed = committedFixed + committedInstallmentsValue;

      const remainingInvest =
        monthlyIncome - committed - investmentMonthlyAmount;

      const dim = getDaysInMonth(date);
      const safeRemaining = isFinite(remainingInvest) ? remainingInvest : 0;

      return {
        committedTotal: committed,
        remainingAfterInvestment: remainingInvest,
        perDay: safeRemaining / dim,
        perWeek: safeRemaining / (dim / 7),
      };
    }, [
      date,
      fixedExpenses,
      monthlyVariations,
      transactions,
      monthlyIncome,
      investmentMonthlyAmount,
    ]);

  return (
    <MonthlyManagementCardView
      committedTotal={committedTotal}
      remainingAfterInvestment={remainingAfterInvestment}
      perDay={perDay}
      perWeek={perWeek}
      investmentMonthlyAmount={investmentMonthlyAmount}
      compact={compact}
    />
  );
};

export const MonthlyManagementCard = React.memo(MonthlyManagementCardComponent);
MonthlyManagementCard.displayName = "MonthlyManagementCard";
