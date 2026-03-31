import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { parseDateInputToLocal } from '../../utils/dateUtils';
import { Transaction, FixedIncome, FixedExpense, Category, MonthlyVariation } from '../../types/FinanceTypes';
import { isItemActiveInMonth } from '../../utils/financeUtils';
type MonthlyHistogramProps = {
  transactions: Transaction[];
  categories: Category[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  monthlyVariations: MonthlyVariation[];
  date: Date;
};
export const MonthlyHistogram: React.FC<MonthlyHistogramProps> = ({
  transactions,
  fixedIncomes,
  fixedExpenses,
  monthlyVariations,
  date
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 shadow-md rounded">
                <p className="text-black dark:text-white font-medium mb-1">{label}</p>
                <p className="text-blue-500">
                    Saldo : {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payload[0].value))}
                </p>
            </div>
        );
    }
    return null;
  };
  // 2. Extrair o ano e o mês atual
  // getMonth() retorna o mês de 0 (Janeiro) a 11 (Dezembro), por isso somamos 1.
   // Ex: Para Outubro, retorna 10


  const anoAtual = date.getFullYear(); // Ex: 2025
  const mesAtual = date.getMonth() + 1;

  const last12Months = Array.from({
    length: 12
  }, (_, i) => {
    const data = new Date(anoAtual, mesAtual - 1 - i, 1);
    return data;
  }).reverse();
  // Formatar os dados para o gráfico
  const data = last12Months.map(dateObj => {
    const anoObj = dateObj.getFullYear();
    const mesObj = dateObj.getMonth(); // 0-based, Janeiro é 0

    // Filter transactions using local date instead of prefix matching
    const monthlyVariableIncome = transactions.filter(t => {
      const tDate = parseDateInputToLocal(t.date.split('T')[0]);
      return tDate.getMonth() === mesObj && 
             tDate.getFullYear() === anoObj && 
             t.type === 'income' && 
             !t.recurringRuleId;
    }).reduce((sum, t) => sum + Number(t.amount), 0);

    // Rendas fixas do mês atual
    const monthlyFixedIncome = fixedIncomes
      .filter(income => isItemActiveInMonth(income, dateObj))
      .reduce((sum, income) => sum + Number(getActualFixedItemAmount(income.id, 'income', anoObj, mesObj, income.amount, monthlyVariations)), 0);
    // Total de rendas (fixas + variáveis)
    const monthlyIncome = monthlyVariableIncome + monthlyFixedIncome;

    // Despesas variáveis do mês atual
    const monthlyVariableExpense = transactions.filter(t => {
      const tDate = parseDateInputToLocal(t.date.split('T')[0]);
      return tDate.getMonth() === mesObj && 
             tDate.getFullYear() === anoObj && 
             t.type === 'expense' && 
             !t.recurringRuleId;
    }).reduce((sum, t) => sum + Number(t.amount), 0);

    // Despesas fixas do mês atual
    const monthlyFixedExpense = fixedExpenses
      .filter(expense => isItemActiveInMonth(expense, dateObj))
      .reduce((sum, expense) => sum + Number(getActualFixedItemAmount(expense.id, 'expense', anoObj, mesObj, expense.amount, monthlyVariations)), 0);
    
    // Total de despesas (fixas + variáveis)
    const monthlyExpense = monthlyVariableExpense + monthlyFixedExpense;

    // Calcular o saldo
    const balance = monthlyIncome - monthlyExpense;
    return {
      month: dateObj.toLocaleDateString('pt-BR', {
        month: 'short'
      }),
      balance: balance
    };
  });
  return <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis 
                tickFormatter={value => new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value as number)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.2)' }} />
            {/* 4. Barra única para o saldo com cores condicionais */}
            <Bar dataKey="balance" name="Saldo" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell 
                        key={`cell-${index}`} 
                        fill={entry.balance >= 0 ? '#22c55e' : '#ef4444'} 
                    />
                ))}
            </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>;
};