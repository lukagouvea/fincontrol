import React, { useState } from 'react';
import { useFinance, VariableExpense } from '../../context/FinanceContext';
export const ExpenseHistory: React.FC = () => {
  const {
    transactions,
    categories
  } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Filtrar apenas despesas
  const expenses = transactions.filter(t => 'isInstallment' in t) as VariableExpense[];
  // Filtrar por mês e ano selecionados
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
  });
  // Ordenar por data (mais recentes primeiro)
  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // Calcular total
  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  // Agrupar por categoria
  const expensesByCategory = categories.filter(cat => cat.type === 'expense').map(category => {
    const categoryExpenses = filteredExpenses.filter(exp => exp.categoryId === category.id);
    const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    return {
      category,
      total: categoryTotal,
      count: categoryExpenses.length
    };
  }).filter(item => item.total > 0).sort((a, b) => b.total - a.total);
  // Formatar valor
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  // Formatar data
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };
  // Obter categoria
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };
  // Gerar opções de mês
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  // Gerar opções de ano (últimos 5 anos)
  const currentYear = new Date().getFullYear();
  const years = Array.from({
    length: 5
  }, (_, i) => currentYear - i);
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Histórico de Despesas
        </h1>
        <div className="flex space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {months.map((month, index) => <option key={index} value={index}>
                {month}
              </option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {years.map(year => <option key={year} value={year}>
                {year}
              </option>)}
          </select>
        </div>
      </div>
      {/* Resumo por categoria */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">
          Resumo por Categoria
        </h2>
        {expensesByCategory.length > 0 ? <div className="space-y-3">
            {expensesByCategory.map(({
          category,
          total,
          count
        }) => <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3" style={{
              backgroundColor: category.color
            }}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {category.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {count} transação(ões)
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatValue(total)}
                </p>
              </div>)}
            <div className="pt-3 border-t border-gray-200 flex justify-between">
              <p className="text-sm font-bold text-gray-900">Total</p>
              <p className="text-sm font-bold text-red-600">
                {formatValue(total)}
              </p>
            </div>
          </div> : <p className="text-sm text-gray-500">
            Nenhuma despesa neste período.
          </p>}
      </div>
      {/* Lista de transações */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Transações</h2>
        </div>
        {sortedExpenses.length > 0 ? <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedExpenses.map(expense => {
            const category = getCategory(expense.categoryId);
            return <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                      {expense.isInstallment && expense.installmentInfo && <span className="ml-2 text-xs text-gray-500">
                          ({expense.installmentInfo.current}/
                          {expense.installmentInfo.total})
                        </span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                  backgroundColor: `${category.color}20`,
                  color: category.color
                }}>
                          {category.name}
                        </span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {formatValue(expense.amount)}
                    </td>
                  </tr>;
          })}
            </tbody>
          </table> : <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa neste período.
          </div>}
      </div>
    </div>;
};