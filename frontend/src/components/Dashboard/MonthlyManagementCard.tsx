import React, { useMemo } from 'react';
import { FixedExpense, MonthlyVariation, Transaction } from '../../types/FinanceTypes';
import { getActualFixedItemAmount, isItemActiveInMonth } from '../../utils/financeUtils';

type MonthlyManagementCardProps = {
  date: Date;
  monthlyIncome: number;
  fixedExpenses: FixedExpense[];
  monthlyVariations: MonthlyVariation[];
  transactions: Transaction[]; // deve incluir parceladas
  investmentMonthlyAmount: number; // configurado pelo usuário (UI/localStorage)
  compact?: boolean; // modo compacto para Relatório Mensal
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getDaysInMonth = (date: Date) => {
  // último dia do mês: dia 0 do mês seguinte
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

export const MonthlyManagementCard: React.FC<MonthlyManagementCardProps> = ({
  date,
  monthlyIncome,
  fixedExpenses,
  monthlyVariations,
  transactions,
  investmentMonthlyAmount,
  compact = false,
}) => {
  const {
    committedTotal,
    remainingAfterInvestment,
    daysInMonth,
    perDay,
    perWeek,
  } = useMemo(() => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const committedFixed = fixedExpenses
      .filter((expense) => isItemActiveInMonth(expense, date))
      .reduce(
        (sum, expense) =>
          sum +
          getActualFixedItemAmount(
            expense.id,
            'expense',
            year,
            month,
            expense.amount,
            monthlyVariations,
          ),
        0,
      );

    const committedInstallmentsValue = transactions
      .filter((t) => ('installmentInfo' in t && !!t.installmentInfo))
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const committed = committedFixed + committedInstallmentsValue;

  const remainingInvest = monthlyIncome - committed - investmentMonthlyAmount;

    const dim = getDaysInMonth(date);
    const safeRemaining = isFinite(remainingInvest) ? remainingInvest : 0;

    return {
      committedTotal: committed,
      remainingAfterInvestment: remainingInvest,
      daysInMonth: dim,
      perDay: safeRemaining / dim,
      perWeek: safeRemaining / (dim / 7),
    };
  }, [date, fixedExpenses, monthlyVariations, transactions, monthlyIncome, investmentMonthlyAmount]);

  const negativeClass = (value: number) => (value < 0 ? 'text-red-600' : 'text-blue-600');

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>

      <div className={compact ? "border-t border-gray-200 pt-2" : "border-t border-gray-200 pt-3"}>
        {/* Layout em 2 colunas para lg, vertical para md */}
        <div className={compact ? "lg:grid lg:grid-cols-2 lg:gap-4" : ""}>
          {/* Coluna esquerda: Investimento e Gerenciamento */}
          <div>
            <div className="flex justify-between items-center">
              <span className={compact ? "text-xs font-medium text-gray-600" : "text-sm font-medium text-gray-600"}>Investimento</span>
              <span className={compact ? "text-xs font-semibold text-gray-800" : "text-sm font-semibold text-gray-800"}>- {formatBRL(investmentMonthlyAmount)}</span>
            </div>
            <div className={compact ? "flex justify-between items-center mt-1" : "flex justify-between items-center mt-2"}>
              <span className={compact ? "text-xs font-medium text-gray-600" : "text-sm font-medium text-gray-600"}>Gerenciamento</span>
              <span className={`${compact ? "text-base" : "text-lg"} font-bold ${negativeClass(remainingAfterInvestment)}`}>{formatBRL(remainingAfterInvestment)}</span>
            </div>
          </div>

          {/* Coluna direita: Por dia e Por semana */}
          <div className={compact ? "mt-1 lg:mt-0 grid grid-cols-2 gap-2 lg:items-center" : "mt-2 grid grid-cols-2 gap-2"}>
            <div className={compact ? "bg-gray-50 rounded-lg p-2 text-center" : "bg-gray-50 rounded-lg p-3"}>
              <p className="text-xs text-gray-500">Por dia</p>
              <p className={`text-sm font-semibold ${negativeClass(perDay)}`}>{formatBRL(perDay)}</p>
            </div>
            <div className={compact ? "bg-gray-50 rounded-lg p-2 text-center" : "bg-gray-50 rounded-lg p-3"}>
              <p className="text-xs text-gray-500">Por semana</p>
              <p className={`text-sm font-semibold ${negativeClass(perWeek)}`}>{formatBRL(perWeek)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
