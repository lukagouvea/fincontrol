import React from 'react';
import { Transaction, Category } from '../../context/FinanceContext';
type RecentTransactionsProps = {
  transactions: Transaction[];
  categories: Category[];
};
export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  categories
}) => {
  // Ordenar transações por data (mais recentes primeiro)
  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10); // Mostrar apenas as 10 mais recentes
  // Formatar valor para exibição
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  // Formatar data para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };
  // Verificar se é uma despesa ou receita
  const isExpense = (transaction: Transaction): boolean => {
    return 'isInstallment' in transaction;
  };
  // Obter categoria
  const getCategory = (transaction: Transaction) => {
    if ('categoryId' in transaction) {
      return categories.find(c => c.id === transaction.categoryId);
    }
    return null;
  };
  return <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
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
          {sortedTransactions.length > 0 ? sortedTransactions.map(transaction => {
          const category = getCategory(transaction);
          const isExpenseTransaction = isExpense(transaction);
          return <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.description}
                    {isExpenseTransaction && 'installmentInfo' in transaction && transaction.installmentInfo && <span className="ml-2 text-xs text-gray-500">
                          ({transaction.installmentInfo.current}/
                          {transaction.installmentInfo.total})
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
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isExpenseTransaction ? 'text-red-600' : 'text-green-600'}`}>
                    {isExpenseTransaction ? '- ' : '+ '}
                    {formatValue(transaction.amount)}
                  </td>
                </tr>;
        }) : <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                Nenhuma transação recente
              </td>
            </tr>}
        </tbody>
      </table>
    </div>;
};