import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction, Category } from '../../context/FinanceContext';
type CategoryPieChartProps = {
  transactions: Transaction[];
  categories: Category[];
};
export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  transactions,
  categories
}) => {
  // Filtrar apenas despesas
  const expenses = transactions.filter(t => 'isInstallment' in t);
  // Calcular o total por categoria
  const categoryTotals = categories.filter(cat => cat.type === 'expense').map(category => {
    const total = expenses.filter(expense => expense.categoryId === category.id).reduce((sum, expense) => sum + expense.amount, 0);
    return {
      id: category.id,
      name: category.name,
      value: total,
      color: category.color || '#888888'
    };
  }).filter(item => item.value > 0);
  // Ordenar por valor (do maior para o menor)
  categoryTotals.sort((a, b) => b.value - a.value);
  // Formatar o valor para o tooltip
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  return <div className="h-64">
      {categoryTotals.length > 0 ? <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={categoryTotals} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
              {categoryTotals.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={value => formatValue(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer> : <div className="h-full flex items-center justify-center text-gray-400">
          Nenhuma despesa registrada
        </div>}
    </div>;
};