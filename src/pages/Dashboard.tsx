import React, { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useFinance, Transaction, VariableExpense } from '../context/FinanceContext';
import { WeeklySpending } from '../components/Dashboard/WeeklySpending';
import { CategoryPieChart } from '../components/Dashboard/CategoryPieChart';
import { MonthlyHistogram } from '../components/Dashboard/MonthlyHistogram';
import { RecentTransactions } from '../components/Dashboard/RecentTransactions';
import { WeeklyFinancialCalendar } from '../components/Dashboard/WeeklyFinancialCalendar';
import { ExpenseModal } from '../components/Expenses/ExpenseModal';
import { IncomeModal } from '../components/Income/IncomeModal';
export const Dashboard: React.FC = () => {
  const {
    transactions,
    categories
  } = useFinance();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Função para formatar data para string YYYY-MM-DD sem problemas de fuso horário
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Calcular o total de rendas do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyIncome = transactions.filter(t => 'categoryId' in t && categories.find(c => c.id === t.categoryId)?.type === 'income').filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + t.amount, 0);
  // Calcular o total de despesas do mês atual
  const monthlyExpense = transactions.filter(t => 'isInstallment' in t).filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + t.amount, 0);
  // Calcular o saldo
  const balance = monthlyIncome - monthlyExpense;
  const handleAddExpenseForDate = (date: Date) => {
    setSelectedDate(date);
    setIsExpenseModalOpen(true);
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex space-x-2">
          <button onClick={() => setIsExpenseModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa
          </button>
          <button onClick={() => setIsIncomeModalOpen(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Renda
          </button>
        </div>
      </div>
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Renda Total do Mês
          </h3>
          <p className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(monthlyIncome)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">
            Gasto Total do Mês
          </h3>
          <p className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(monthlyExpense)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Saldo Atual</h3>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(balance)}
          </p>
        </div>
      </div>
      {/* Weekly Financial Calendar */}
      <WeeklyFinancialCalendar onAddExpense={handleAddExpenseForDate} />
      {/* Gráficos e visualizações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Gastos Semanais
          </h3>
          <WeeklySpending transactions={transactions} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Gastos por Categoria
          </h3>
          <CategoryPieChart transactions={transactions} categories={categories} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Histórico Mensal
          </h3>
          <MonthlyHistogram transactions={transactions} />
        </div>
      </div>
      {/* Transações recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">
            Transações Recentes
          </h3>
        </div>
        <RecentTransactions transactions={transactions} categories={categories} />
      </div>
      {/* Modais */}
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => {
      setIsExpenseModalOpen(false);
      setSelectedDate(null);
    }} initialDate={selectedDate ? formatDateToYYYYMMDD(selectedDate) : undefined} />
      <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} />
    </div>;
};