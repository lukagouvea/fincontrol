import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { Transaction, Category, } from '../../types/FinanceTypes';
type CategoryPieChartProps = {
  transactions: Transaction[];
  categories: Category[];
  date: Date;
};
export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  transactions,
  categories,
  date
}) => {
  const {
    getActualFixedItemAmount
  } = useFinance();
  // getMonth() retorna o mês de 0 (Janeiro) a 11 (Dezembro), por isso somamos 1.
  const anoAtual = date.getFullYear(); // Ex: 2025
  const mesAtual = date.getMonth() + 1; // Ex: Para Outubro, retorna 10

  // padStart(2, '0') garante que o mês tenha sempre dois dígitos. Ex: 9 vira "09", 10 continua "10".
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`; // Ex: "2025-10"


  // Filtrar apenas despesas
  const expenses = transactions.filter(t => ('isInstallment' in t || 'startDate' in t) && t.date.startsWith(anoMesAtualString))
  .map(expense => ({
    ...expense,
    amount: 'isInstallment' in expense ? expense.amount : getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual-1, expense.amount)
  }))
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
            <Pie data={categoryTotals} cx="50%" cy="50%" labelLine={false} outerRadius={80} innerRadius={45} fill="#8884d8" dataKey="value">
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