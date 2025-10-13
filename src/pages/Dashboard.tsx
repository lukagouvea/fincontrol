import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
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

const LOCAL_STORAGE_KEY = 'dashboardLayout';



// Definir os componentes do dashboard que podem ser reordenados
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
    fixedExpenses
  } = useFinance();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // useMemo cria um novo objeto Date sempre que o mês ou o ano mudarem.
  const selectedDateObject = useMemo(() => {
      // Criamos a data sempre no dia 1 para evitar problemas com meses de tamanhos diferentes
      return new Date(selectedYear, selectedMonth, 1);
    }, [selectedMonth, selectedYear]); // Lista de dependências do useMemo

  
  const [dashboardComponents, setDashboardComponents] = useState<DashboardComponentConfig[]>( () => {
    try {
      // Tenta buscar o layout salvo no localStorage.
      const savedLayout = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      
      // Se encontrou algo, converte de string JSON para objeto e retorna.
      if (savedLayout) {
        return JSON.parse(savedLayout);
      }
    } catch (error) {
      // Se houver um erro na leitura ou no parse, ignora e usa o padrão.
      console.error("Erro ao ler o layout do dashboard do localStorage", error);
    }
    
    // Se não encontrou nada, retorna o layout padrão.
    return defaultDashboardLayout;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dashboardComponents));
    } catch (error) {
      console.error("Erro ao salvar o layout do dashboard no localStorage", error);
    }
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  }, [dashboardComponents]);

  // Configuração do DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));

  function isItemActiveInMonth(
    item: { startDate: string; endDate?: string | null },
    targetDate: Date
  ): boolean {
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-11

    const startDate = new Date(item.startDate);
    // Adiciona a correção para o fuso horário ao criar a data
    startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
    
    const endDate = item.endDate ? new Date(item.endDate) : null;
    if(endDate) {
      endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
    }
    
    // Condição de Início: O item deve ter começado no passado ou neste mês/ano.
    const startValid =
      startDate.getFullYear() < targetYear ||
      (startDate.getFullYear() === targetYear && startDate.getMonth() <= targetMonth);
    
    // Condição de Fim: O item não deve ter uma data de fim, ou a data de fim
    // é no futuro ou neste mês/ano.
    const endValid =
      !endDate ||
      endDate.getFullYear() > targetYear ||
      (endDate.getFullYear() === targetYear && endDate.getMonth() >= targetMonth);

    return startValid && endValid;
  }

  // Função para formatar data para string YYYY-MM-DD sem problemas de fuso horário
  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // Rendas variáveis do mês atual

  const anoAtual = selectedDateObject.getFullYear(); // Ex: 2025
  const mesAtual = selectedDateObject.getMonth() + 1; // Ex: Para Outubro, retorna 10

  // 3. Formatar a string 'AAAA-MM' para garantir a comparação correta (com o zero à esquerda no mês)
  // padStart(2, '0') garante que o mês tenha sempre dois dígitos. Ex: 9 vira "09", 10 continua "10".
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`; // Ex: "2025-10"

  const monthlyVariableIncome = transactions.filter(t => 'categoryId' in t && categories.find(c => c.id === t.categoryId)?.type === 'income' && t.date.startsWith(anoMesAtualString)).reduce((sum, t) => sum + t.amount, 0);
  // Rendas fixas do mês atual
  const monthlyFixedIncome = fixedIncomes
    .filter(income => isItemActiveInMonth(income, selectedDateObject))
    .reduce((sum, income) => sum + income.amount, 0);
  // Total de rendas (fixas + variáveis)
  const monthlyIncome = monthlyVariableIncome + monthlyFixedIncome;
  // Despesas variáveis do mês atual
  const monthlyVariableExpense = transactions.filter(t => 'isInstallment' in t && t.date.startsWith(anoMesAtualString)).reduce((sum, t) => sum + t.amount, 0);

  // Despesas fixas do mês atual (Igualmente limpo!)
  const monthlyFixedExpense = fixedExpenses
    .filter(expense => isItemActiveInMonth(expense, selectedDateObject))
    .reduce((sum, expense) => sum + expense.amount, 0);
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

  const getComponentById = (id: string) => {
    switch (id) {
      case 'weekly-calendar':
        return <WeeklyFinancialCalendar onAddExpense={handleAddExpenseForDate} />;
      case 'category-pie':
        return <CategoryPieChart transactions={transactions} categories={categories} date={new Date()} />;
      case 'expenses-histogram':
        return <ExpensesValueHistogram transactions={transactions} date={new Date()} />;
      case 'weekly-spending':
        return <WeeklySpending transactions={transactions} />;
      case 'monthly-histogram':
        return <MonthlyHistogram transactions={transactions} categories={categories} fixedExpenses={fixedExpenses} fixedIncomes={fixedIncomes} date={new Date()}/>;
      case 'recent-transactions':
        return <RecentTransactions transactions={transactions} categories={categories} date={new Date()} />;
      default:
        return null;
    }
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
      {/* Cards de resumo - fixos no topo */}
      <div id="cards" className="grid grid-cols-1 md:grid-rows-1 md:grid-cols-3 gap-6">
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
          <h3 className="text-sm font-medium text-gray-500">Saldo do Mês</h3>
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
          <div className="grid grid-cols-2 gap-6">
            {dashboardComponents.map(config => (
              <SortableDashboardItem key={config.id} id={config.id} title={config.title} span={config.span}>
                {/* Chama a função para obter o componente com props frescas */}
                {getComponentById(config.id)} 
              </SortableDashboardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {/* Modais */}
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => {
      setIsExpenseModalOpen(false);
      setSelectedDate(null);
    }} initialDate={selectedDate ? formatDateToYYYYMMDD(selectedDate) :formatDateToYYYYMMDD(new Date())} />
      <IncomeModal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} />
    </div>;
};