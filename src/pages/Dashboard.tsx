import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { WeeklySpending } from '../components/Dashboard/WeeklySpending';
import { CategoryPieChart } from '../components/Dashboard/CategoryPieChart';
import { MonthlyHistogram } from '../components/Dashboard/MonthlyHistogram';
import { RecentTransactions } from '../components/Dashboard/RecentTransactions';
import { WeeklyFinancialCalendar } from '../components/Dashboard/WeeklyFinancialCalendar';
import { ExpensesValueHistogram } from '../components/Dashboard/ExpensesValueHistogram';
import { ExpenseModal, ExpenseFormData } from '../components/Expenses/ExpenseModal';
import { IncomeModal, IncomeFormData } from '../components/Income/IncomeModal';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../components/Dashboard/SortableDashboardItem';
import { formatDateToYYYYMMDD, parseDateInputToLocal, convertDateToUTCISOString } from '../utils/dateUtils';
import { generateParcelas, isItemActiveInMonth } from '../utils/financeUtils';

const LOCAL_STORAGE_KEY = 'dashboardLayout';

type DashboardComponentConfig = {
  id: string;
  title: string;
  span: number;
};

const defaultDashboardLayout: DashboardComponentConfig[] = [
  { id: 'weekly-calendar', title: 'Calendário Financeiro Semanal', span: 2 },
  { id: 'category-pie', title: 'Gastos por Categoria', span: 1 },
  { id: 'expenses-histogram', title: 'Distribuição de Gastos por Valor', span: 1 },
  { id: 'weekly-spending', title: 'Gastos Semanais', span: 2 },
  { id: 'monthly-histogram', title: 'Histórico de Saldo Mensal', span: 2 },
  { id: 'recent-transactions', title: 'Transações Recentes', span: 2 },
];

export const Dashboard: React.FC = () => {
  const {
    transactions,
    categories,
    fixedIncomes,
    fixedExpenses,
    getActualFixedItemAmount,
    addTransaction,
    addCompraParcelada,
  } = useFinance();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [initialDateForModal, setInitialDateForModal] = useState<string | undefined>(undefined);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const selectedDateObject = useMemo(() => new Date(selectedYear, selectedMonth, 1), [selectedMonth, selectedYear]);

  const [dashboardComponents, setDashboardComponents] = useState<DashboardComponentConfig[]>(() => {
    try {
      const savedLayout = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedLayout ? JSON.parse(savedLayout) : defaultDashboardLayout;
    } catch (error) {
      console.error("Erro ao ler o layout do dashboard do localStorage", error);
      return defaultDashboardLayout;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dashboardComponents));
    } catch (error) {
      console.error("Erro ao salvar o layout do dashboard no localStorage", error);
    }
  }, [dashboardComponents]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  

  const { monthlyIncome, monthlyFixedIncome, monthlyVariableIncome, monthlyExpense, monthlyFixedExpense, monthlyVariableExpense, balance } = useMemo(() => {
    const anoAtual = selectedDateObject.getFullYear();
    const mesAtual = selectedDateObject.getMonth(); // 0-11

    const getVariableTransactions = (type: 'income' | 'expense') => {
        return transactions.filter(t => {
            const transactionDate = parseDateInputToLocal(t.date.split('T')[0]);
            const isCorrectType = type === 'income' ? !('isInstallment' in t) : 'isInstallment' in t;
            return isCorrectType && transactionDate.getFullYear() === anoAtual && transactionDate.getMonth() === mesAtual;
        });
    };

    const variableIncomes = getVariableTransactions('income');
    const variableExpenses = getVariableTransactions('expense');

    const monthlyVariableIncome = variableIncomes.reduce((sum, t) => sum + t.amount, 0);
    const monthlyVariableExpense = variableExpenses.reduce((sum, t) => sum + t.amount, 0);

    const monthlyFixedIncome = fixedIncomes
      .filter(income => isItemActiveInMonth(income, selectedDateObject))
      .reduce((sum, income) => sum + getActualFixedItemAmount(income.id, 'income', anoAtual, mesAtual, income.amount), 0);

    const monthlyFixedExpense = fixedExpenses
      .filter(expense => isItemActiveInMonth(expense, selectedDateObject))
      .reduce((sum, expense) => sum + getActualFixedItemAmount(expense.id, 'expense', anoAtual, mesAtual, expense.amount), 0);

    const totalIncome = monthlyVariableIncome + monthlyFixedIncome;
    const totalExpense = monthlyVariableExpense + monthlyFixedExpense;
    const balance = totalIncome - totalExpense;

    return { monthlyIncome: totalIncome, monthlyFixedIncome, monthlyVariableIncome, monthlyExpense: totalExpense, monthlyFixedExpense, monthlyVariableExpense, balance };
  }, [selectedDateObject, transactions, fixedIncomes, fixedExpenses, getActualFixedItemAmount]);


  const handleAddExpenseForDate = (date: Date) => {
    setInitialDateForModal(formatDateToYYYYMMDD(date));
    setIsExpenseModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDashboardComponents(items => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleExpenseSubmit = (formData: ExpenseFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);

    if (formData.isInstallment && formData.installmentCount > 1) {
      const compraParcelada = {
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        numParcelas: formData.installmentCount,
        parcelas: generateParcelas(formData.amount, formData.installmentCount, formData.description, localDateObject, formData.categoryId)
      };
      addCompraParcelada(compraParcelada);
    } else {
      addTransaction({
        description: formData.description,
        amount: formData.amount,
        date: utcTimestamp,
        categoryId: formData.categoryId,
        isInstallment: false,
      });
    }
    setIsExpenseModalOpen(false);
  };

  const handleIncomeSubmit = (formData: IncomeFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);

    addTransaction({
      description: formData.description,
      amount: formData.amount,
      date: utcTimestamp,
      categoryId: formData.categoryId,
    });
    setIsIncomeModalOpen(false);
  };


  const getComponentById = (id: string) => {
    switch (id) {
      case 'weekly-calendar':
        return <WeeklyFinancialCalendar onAddExpense={handleAddExpenseForDate} />;
      case 'category-pie':
        return <CategoryPieChart transactions={transactions} categories={categories} date={selectedDateObject} />;
      case 'expenses-histogram':
        return <ExpensesValueHistogram transactions={transactions} date={selectedDateObject} />;
      case 'weekly-spending':
        return <WeeklySpending transactions={transactions} />;
      case 'monthly-histogram':
        return <MonthlyHistogram transactions={transactions} categories={categories} fixedExpenses={fixedExpenses} fixedIncomes={fixedIncomes} date={selectedDateObject} />;
      case 'recent-transactions':
        return <RecentTransactions transactions={transactions} categories={categories} date={selectedDateObject} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
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
      
      <div id="cards" className="grid grid-cols-1 md:grid-rows-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Renda Total do Mês</h3>
          <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}</p>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Rendas Fixas:</span>
              <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyFixedIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Rendas Variáveis:</span>
              <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyVariableIncome)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Gasto Total do Mês</h3>
          <p className="text-2xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpense)}</p>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Despesas Fixas:</span>
              <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyFixedExpense)}</span>
            </div>
            <div className="flex justify-between">
              <span>Despesas Variáveis:</span>
              <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyVariableExpense)}</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Saldo do Mês</h3>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance)}</p>
          <div className="mt-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Total de Rendas:</span>
              <span className="text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total de Gastos:</span>
              <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyExpense)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={dashboardComponents.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-2 gap-6">
            {dashboardComponents.map(config => (
              <SortableDashboardItem key={config.id} id={config.id} title={config.title} span={config.span}>
                {getComponentById(config.id)}
              </SortableDashboardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <ExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => {
          setIsExpenseModalOpen(false);
          setInitialDateForModal(undefined);
        }}
        onSubmit={handleExpenseSubmit}
        initialData={{ date: initialDateForModal }}
      />
      <IncomeModal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)}
        onSubmit={handleIncomeSubmit}
      />
    </div>
  );
};