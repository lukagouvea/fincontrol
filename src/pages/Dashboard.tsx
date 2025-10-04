import React, { useState, Component } from 'react';
import { PlusIcon } from 'lucide-react';
import { useFinance, Transaction, VariableExpense } from '../context/FinanceContext';
import { WeeklySpending } from '../components/Dashboard/WeeklySpending';
import { CategoryPieChart } from '../components/Dashboard/CategoryPieChart';
import { MonthlyHistogram } from '../components/Dashboard/MonthlyHistogram';
import { RecentTransactions } from '../components/Dashboard/RecentTransactions';
import { WeeklyFinancialCalendar } from '../components/Dashboard/WeeklyFinancialCalendar';
import { ExpensesValueHistogram } from '../components/Dashboard/ExpensesValueHistogram';
import { ExpenseModal } from '../components/Expenses/ExpenseModal';
import { IncomeModal } from '../components/Income/IncomeModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../components/Dashboard/SortableDashboardItem';
// Definir os componentes do dashboard que podem ser reordenados
type DashboardComponent = {
  id: string;
  title: string;
  component: React.ReactNode;
};
export const Dashboard: React.FC = () => {
  const {
    transactions,
    categories,
    fixedIncomes,
    fixedExpenses
  } = useFinance();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Estado para controlar a ordem dos componentes do dashboard
  const [dashboardComponents, setDashboardComponents] = useState<DashboardComponent[]>([{
    id: 'weekly-calendar',
    title: 'Calendário Financeiro Semanal',
    component: <WeeklyFinancialCalendar onAddExpense={handleAddExpenseForDate} />
  }, {
    id: 'weekly-spending',
    title: 'Gastos Semanais',
    component: <WeeklySpending transactions={transactions} />
  }, {
    id: 'category-pie',
    title: 'Gastos por Categoria',
    component: <CategoryPieChart transactions={transactions} categories={categories} />
  }, {
    id: 'expenses-histogram',
    title: 'Distribuição de Gastos por Valor',
    component: <ExpensesValueHistogram transactions={transactions} />
  }, {
    id: 'monthly-histogram',
    title: 'Histórico Mensal',
    component: <MonthlyHistogram transactions={transactions} />
  }, {
    id: 'recent-transactions',
    title: 'Transações Recentes',
    component: <RecentTransactions transactions={transactions} categories={categories} />
  }]);
  // Configuração do DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  // Função para formatar data para string YYYY-MM-DD sem problemas de fuso horário
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Calcular o total de rendas do mês atual (mês completo)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  // Rendas variáveis do mês atual
  const monthlyVariableIncome = transactions.filter(t => 'categoryId' in t && categories.find(c => c.id === t.categoryId)?.type === 'income').filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + t.amount, 0);
  // Rendas fixas do mês atual
  const monthlyFixedIncome = fixedIncomes.filter(income => {
    // Verificar se a renda fixa está ativa no mês atual
    const startDate = new Date(income.startDate);
    const endDate = income.endDate ? new Date(income.endDate) : null;
    // Verificar se o mês atual está dentro do período de validade
    const startValid = startDate.getFullYear() < currentYear || startDate.getFullYear() === currentYear && startDate.getMonth() <= currentMonth;
    const endValid = !endDate || endDate.getFullYear() > currentYear || endDate.getFullYear() === currentYear && endDate.getMonth() >= currentMonth;
    return startValid && endValid;
  }).reduce((sum, income) => sum + income.amount, 0);
  // Total de rendas (fixas + variáveis)
  const monthlyIncome = monthlyVariableIncome + monthlyFixedIncome;
  // Despesas variáveis do mês atual
  const monthlyVariableExpense = transactions.filter(t => 'isInstallment' in t).filter(t => {
    const transDate = new Date(t.date);
    return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + t.amount, 0);
  // Despesas fixas do mês atual
  const monthlyFixedExpense = fixedExpenses.filter(expense => {
    // Verificar se a despesa fixa está ativa no mês atual
    const startDate = new Date(expense.startDate);
    const endDate = expense.endDate ? new Date(expense.endDate) : null;
    // Verificar se o mês atual está dentro do período de validade
    const startValid = startDate.getFullYear() < currentYear || startDate.getFullYear() === currentYear && startDate.getMonth() <= currentMonth;
    const endValid = !endDate || endDate.getFullYear() > currentYear || endDate.getFullYear() === currentYear && endDate.getMonth() >= currentMonth;
    return startValid && endValid;
  }).reduce((sum, expense) => sum + expense.amount, 0);
  // Total de despesas (fixas + variáveis)
  const monthlyExpense = monthlyVariableExpense + monthlyFixedExpense;
  // Calcular o saldo
  const balance = monthlyIncome - monthlyExpense;
  function handleAddExpenseForDate(date: Date) {
    setSelectedDate(date);
    setIsExpenseModalOpen(true);
  }
  function handleDragEnd(event: DragEndEvent) {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      setDashboardComponents(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }
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
      {/* Cards de resumo - fixos no topo */}
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
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Rendas Fixas:</span>
              <span className="text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyFixedIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rendas Variáveis:</span>
              <span className="text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyVariableIncome)}
              </span>
            </div>
          </div>
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
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Despesas Fixas:</span>
              <span className="text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyFixedExpense)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Despesas Variáveis:</span>
              <span className="text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyVariableExpense)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Saldo Atual</h3>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(balance)}
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Total de Rendas:</span>
              <span className="text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total de Gastos:</span>
              <span className="text-red-600">
                {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(monthlyExpense)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Componentes do dashboard reordenáveis */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboardComponents.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {dashboardComponents.map(component => <SortableDashboardItem key={component.id} id={component.id} title={component.title}>
                {component.component}
              </SortableDashboardItem>)}
          </div>
        </SortableContext>
      </DndContext>
      {/* Modais */}
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => {
      setIsExpenseModalOpen(false);
      setSelectedDate(null);
    }} initialDate={selectedDate ? formatDateToYYYYMMDD(selectedDate) : undefined} />
      <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} />
    </div>;
};