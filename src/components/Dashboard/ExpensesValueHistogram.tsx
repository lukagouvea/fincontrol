import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../context/FinanceContext';
type ExpensesValueHistogramProps = {
  transactions: Transaction[];
};
export const ExpensesValueHistogram: React.FC<ExpensesValueHistogramProps> = ({
  transactions
}) => {
  // Filtrar apenas despesas
  const expenses = transactions.filter(t => 'isInstallment' in t);
  // Definir faixas de valores para o histograma
  const ranges = [{
    min: 0,
    max: 50,
    label: 'R$ 0-50'
  }, {
    min: 50,
    max: 100,
    label: 'R$ 50-100'
  }, {
    min: 100,
    max: 200,
    label: 'R$ 100-200'
  }, {
    min: 200,
    max: 500,
    label: 'R$ 200-500'
  }, {
    min: 500,
    max: 1000,
    label: 'R$ 500-1000'
  }, {
    min: 1000,
    max: Infinity,
    label: 'R$ 1000+'
  }];
  // Agrupar despesas por faixa de valor
  const data = ranges.map(range => {
    const count = expenses.filter(expense => expense.amount >= range.min && expense.amount < range.max).length;
    return {
      range: range.label,
      quantidade: count
    };
  });
  return <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{
        top: 10,
        right: 30,
        left: 0,
        bottom: 5
      }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="range" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={value => [`${value} transações`, 'Quantidade']} />
          <Bar dataKey="quantidade" fill="#9333ea" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>;
};