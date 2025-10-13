import React, { useMemo, useState } from 'react';
import { CategoryPieChart } from '../../components/Dashboard/CategoryPieChart';
import { useFinance, VariableExpense } from '../../context/FinanceContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableDashboardItem } from '../../components/Dashboard/SortableDashboardItem';
import { ExpensesValueHistogram } from '../../components/Dashboard/ExpensesValueHistogram';

type DashboardComponentInfo = {
  id: string;
  title: string;
  span: number;
};

export const ExpenseHistory: React.FC = () => {
  const {
    transactions,
    fixedExpenses,
    categories
  } = useFinance();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    // useMemo cria um novo objeto Date sempre que o mês ou o ano mudarem.
  const selectedDateObject = useMemo(() => {
    // Criamos a data sempre no dia 1 para evitar problemas com meses de tamanhos diferentes
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedMonth, selectedYear]); // Lista de dependências do useMemo

  const [dashboardOrder, setDashboardOrder] = useState<DashboardComponentInfo[]>([
    { id: 'category-pie', title: 'Gastos por Categoria', span: 1},
    { id: 'expenses-histogram', title: 'Distribuição de Gastos por Valor', span: 1 },
  ]);


  // Configuração do DnD
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));



  function handleDragEnd(event: DragEndEvent) {
      const {
        active,
        over
      } = event;
      if (over && active.id !== over.id) {
        setDashboardOrder(items => {
          const oldIndex = items.findIndex(item => item.id === active.id);
          const newIndex = items.findIndex(item => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }
  const anoAtual = selectedDateObject.getFullYear(); // Ex: 2025
  const mesAtual = selectedDateObject.getMonth() + 1; // Ex: Para Outubro, retorna 10

  // 3. Formatar a string 'AAAA-MM' para garantir a comparação correta (com o zero à esquerda no mês)
  // padStart(2, '0') garante que o mês tenha sempre dois dígitos. Ex: 9 vira "09", 10 continua "10".
  const anoMesAtualString = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`; // Ex: "2025-10"



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

  const getFixedExpenseDate = (expense: {day: number}) => {
    const date = new Date(selectedYear, selectedMonth, expense.day);
    return date.toISOString().split('T')[0];
  }

  const monthlyFixedExpense = fixedExpenses
    .filter(expense => isItemActiveInMonth(expense, selectedDateObject))
    .map(expense => ({
      ...expense,
      date: getFixedExpenseDate(expense)
    }));


  // Filtrar apenas despesas
  const monthlyVariableExpense = transactions.filter(t => 'isInstallment' in t && t.date.startsWith(anoMesAtualString))

  const monthlyExpense = [...monthlyVariableExpense, ...monthlyFixedExpense]

  // Ordenar por data (mais recentes primeiro)
  const sortedExpenses = [...monthlyExpense].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  // Calcular total
  const total = monthlyExpense.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Agrupar por categoria
  const expensesByCategory = categories.filter(cat => cat.type === 'expense').map(category => {
    const categoryExpenses = monthlyExpense.filter(exp => exp.categoryId === category.id);
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
  const formatDateToDDMMAAAA = (dataString : string): string => {
    // Verifica se a entrada é uma string e corresponde ao formato esperado (usando uma expressão regular)
    if (typeof dataString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
      return "Formato de data inválido. Use AAAA-MM-DD.";
    }

    // Divide a string da data em ano, mês e dia
    const [ano, mes, dia] = dataString.split('-');

    // Retorna a data no novo formato DD/MM/AAAA
    return `${dia}/${mes}/${ano}`;
  };
  // Formatar data
  const formatDate = (dateStr: string) => {
    return formatDateToDDMMAAAA(dateStr);
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

  const componentsMap: Record<string, React.ReactNode> = {
    'category-pie': (
      <CategoryPieChart
        transactions={monthlyExpense}
        categories={expensesByCategory.map(item => item.category)}
        date={selectedDateObject}
      />
    ),
    'expenses-histogram': (
      <ExpensesValueHistogram
        transactions={monthlyExpense}
        date={selectedDateObject}
      />
    ),
  };


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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={dashboardOrder.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-6">
            {dashboardOrder.map(item => (
              <SortableDashboardItem key={item.id} id={item.id} title={item.title} span={item.span}>
                {/* O componente correto é pego do mapa com a data atualizada */}
                {componentsMap[item.id]} 
              </SortableDashboardItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>;
};