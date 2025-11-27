import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { useTransactions, useAddTransaction, useUpdateTransaction, useDeleteTransaction, useAddCompraParcelada } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { Transaction, VariableExpense as VariableExpenseType } from '../../types/FinanceTypes';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { ExpenseModal, ExpenseFormData } from '../../components/Expenses/ExpenseModal';
import { parseDateInputToLocal, convertDateToUTCISOString, formatUTCToDDMMAAAA } from '../../utils/dateUtils';
import { Skeleton } from '../../components/Shared/Skeleton';


export const VariableExpenses: React.FC = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VariableExpenseType | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  const { data: transactions = [], isLoading: isTransactionsLoading } = useTransactions(selectedMonth, selectedYear);
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();

  const isLoading = isTransactionsLoading || isLoadingCategories;

  const addTransactionMutation = useAddTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const addCompraParceladaMutation = useAddCompraParcelada();

  
  
  const isSaving = addTransactionMutation.isPending || updateTransactionMutation.isPending;


  const variableExpenses = useMemo(() => 
    transactions.filter((t): t is VariableExpenseType => t.type == 'expense' && !t.recurringRuleId), 
    [transactions]
  );

  const filteredExpenses = useMemo(() => {
    return variableExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const isSameMonth = expenseDate.getMonth() === selectedMonth && expenseDate.getFullYear() === selectedYear;
      const isNotFixedVariation = !expense.recurringRuleId;
      const isExpenseType = expense.type === 'expense';
      return isSameMonth && isExpenseType && isNotFixedVariation;
    });
  }, [variableExpenses, selectedMonth, selectedYear]);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + 2 - i);

  const handleRequestDelete = (expense: Transaction) => {
    setExpenseToDelete(expense);
  };

  const handleCancelDelete = () => {
    setExpenseToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteTransactionMutation.mutate(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  let confirmationMessage = "Você tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.";
  if (expenseToDelete != null && 'isInstallment' in expenseToDelete) {
    confirmationMessage = "Ao excluir esta parcela, todas as outras parcelas da mesma compra também serão removidas. Deseja continuar?";
  }
  
  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (expense: VariableExpenseType) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  
  // 2. A lógica de negócio agora vive aqui
  const handleModalSubmit = (formData: ExpenseFormData) => {
    const expenseData = {
      ...formData,
      type: 'expense' as const,
      date: convertDateToUTCISOString(parseDateInputToLocal(formData.date)),
    };
    const mutationOptions = {
      onSuccess: () => {
        setIsModalOpen(false);
      }
    };

    if (editingExpense) {
      updateTransactionMutation.mutate({ id: editingExpense.id, data: expenseData }, mutationOptions);

    } else {
      if (formData.isInstallment && formData.installmentCount > 1) {
        const compraParcelada = {
          description: expenseData.description,
          amount: expenseData.amount,
          date: expenseData.date,
          categoryId: expenseData.categoryId,
          numParcelas: expenseData.installmentCount,
          type: 'expense' as const,
        };
        addCompraParceladaMutation.mutate(compraParcelada, mutationOptions);
      } else {
        addTransactionMutation.mutate(expenseData, mutationOptions);
      }
    }
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Header sempre visível */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Variáveis</h1>
        <div className="flex items-center space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {months.map((month, index) => <option key={index} value={index}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          // 1. LOADING STATE: Tabela com Skeletons
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td> {/* Data */}
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="flex items-center">
                        <Skeleton className="h-4 w-48" /> {/* Descrição */}
                        <Skeleton className="h-3 w-12 ml-2" /> {/* Parcelas (X/Y) */}
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-24 rounded-full" /></td> {/* Categoria Pill */}
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td> {/* Valor */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-5 h-5 rounded" /> {/* Botão Edit */}
                      <Skeleton className="w-5 h-5 rounded" /> {/* Botão Delete */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filteredExpenses.length > 0 ? (
          // 2. DATA STATE: Tabela Real
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                return (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(expense.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.description}
                      {expense.installmentInfo && <span className="ml-2 text-xs text-gray-500">({expense.installmentInfo.current}/{expense.installmentInfo.total})</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{formatValue(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleOpenEditModal(expense)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(expense)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          // 3. EMPTY STATE
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma despesa variável para o período selecionado.
          </div>
        )}
      </div>
      
      <ExpenseModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingExpense}
        isLoading={isSaving}
      />
      
      <ConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={confirmationMessage}
      />
    </div>
  );
};