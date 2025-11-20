import React from 'react';
import { useFinance, Transaction, Category } from '../../context/FinanceContext';
import { formatUTCToDDMMAAAA } from '../../utils/dateUtils';

type RecentTransactionsProps = {
  date: Date;
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ date }) => {
  const { transactions, categories } = useFinance();

  // Formatar valor para exibição
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear();
  });

  const sortedTransactions = [...filteredTransactions].slice(0, 10);

  const getCategory = (transaction: Transaction) => {
    return categories.find(c => c.id === transaction.categoryId);
  };

  return (
    <div className="overflow-x-auto">
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
            const isExpense = transaction.type === 'expense';
            return (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatUTCToDDMMAAAA(transaction.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.description}
                  {isExpense && 'installmentInfo' in transaction && transaction.installmentInfo && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({transaction.installmentInfo.current}/{transaction.installmentInfo.total})
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category ? (
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" 
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.name}
                    </span>
                  ) : '-'}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                  {isExpense ? '- ' : '+ '}
                  {formatValue(transaction.amount)}
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                Nenhuma transação recente
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};