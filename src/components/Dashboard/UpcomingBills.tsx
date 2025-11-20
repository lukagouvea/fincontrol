import React, { useMemo } from 'react';
// 1. Importe os ícones necessários
import { CreditCard, ArrowDownCircle } from 'lucide-react'; 
import { isItemActiveInMonth } from '../../utils/financeUtils';
import { parseDateInputToLocal } from '../../utils/dateUtils';
import { FixedExpense, Transaction } from '../../context/FinanceContext';

type UpcomingBill = {
  id: string;
  description: string;
  amount: number;
  dueDate: number; // Apenas o dia do mês
  type: 'fixed' | 'installment'; // 2. Adicione o tipo aqui
};

type UpcomingBillsProps = {
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  date: Date; // O objeto Date do mês selecionado
};

export const UpcomingBills: React.FC<UpcomingBillsProps> = ({ fixedExpenses, transactions, date }) => {
  const { upcomingBills, totalAmount } = useMemo(() => {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    // Pega as despesas fixas ativas para o mês
    const activeFixedExpenses: UpcomingBill[] = fixedExpenses
      .filter(expense => isItemActiveInMonth(expense, date))
      .map(expense => ({
        id: `fixed-${expense.id}`,
        description: expense.description,
        amount: expense.amount,
        dueDate: expense.day,
        type: 'fixed', // Adiciona o tipo 'fixed'
      }));

    // Pega as parcelas que vencem no mês
    const monthlyInstallments: UpcomingBill[] = transactions
      .filter(t => {
        if (!t.isInstallment) return false;
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
      })
      .map(t => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        dueDate: new Date(t.date).getDate(),
        type: 'installment', // Adiciona o tipo 'installment'
      }));
    
    // Combina e ordena por data de vencimento
    const allBills = [...activeFixedExpenses, ...monthlyInstallments]
      .sort((a, b) => a.dueDate - b.dueDate);

    // Calcula o total
    const total = allBills.reduce((sum, bill) => sum + bill.amount, 0);

    return { upcomingBills: allBills, totalAmount: total };
  }, [fixedExpenses, transactions, date]);

  const getDueDateText = (dueDate: number) => {
    const today = new Date();
    const dueDateThisMonth = new Date(date.getFullYear(), date.getMonth(), dueDate);
    
    if (today.getMonth() === date.getMonth() && today.getFullYear() === date.getFullYear()) {
      const diffTime = dueDateThisMonth.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return <span className="text-red-500">Vencido</span>;
      if (diffDays === 0) return <span className="text-yellow-600">Vence hoje</span>;
      if (diffDays === 1) return `Vence amanhã`;
      return `Vence em ${diffDays} dias`;
    }

    return `Vencimento dia ${dueDate}`;
  };

  return (
    <div className="flex flex-col h-full">
      {upcomingBills.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          Nenhuma conta a pagar para este mês.
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto pr-2">
          <ul className="space-y-2">
            {upcomingBills.map((bill, index) => (
              <li key={bill.id} className={`flex items-center justify-between py-3 ${index < upcomingBills.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center space-x-3">
                  {/* 3. Lógica para renderizar o ícone correto */}
                  <div className="bg-gray-100 p-2 rounded-full">
                    {bill.type === 'installment' ? (
                      <CreditCard className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">{bill.description}</p>
                    <p className="text-xs text-gray-500">{getDueDateText(bill.dueDate)}</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-gray-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {upcomingBills.length > 0 && (
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total a Pagar no Mês:</span>
            <span className="text-lg font-bold text-red-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};