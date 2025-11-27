import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Transaction, VariableIncome as VariableIncomeType } from '../../types/FinanceTypes';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { IncomeModal, IncomeFormData } from '../../components/Income/IncomeModal'; // Importa o novo modal e seu tipo
import { parseDateInputToLocal, convertDateToUTCISOString, formatUTCToDDMMAAAA } from '../../utils/dateUtils';
import { useTransactions, useAddTransaction, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import { Skeleton } from '../../components/Shared/Skeleton';


export const VariableIncome: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<VariableIncomeType | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: transactions = [], isLoading: isTransactionsLoading } = useTransactions(selectedMonth, selectedYear);
  const { data : categories = [], isLoading: isLoadingCategories } = useCategories();

  const isLoading = isTransactionsLoading || isLoadingCategories;

  // 2. Mutações (Escrita)
  const addTransactionMutation = useAddTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  
  const isSaving = addTransactionMutation.isPending || updateTransactionMutation.isPending;

  const variableIncomes = useMemo(() => 
    transactions.filter((t): t is VariableIncomeType => {
      return t.type == 'income' && !t.recurringRuleId
    }), 
    [transactions]
  );

  const filteredIncomes = useMemo(() => {
    return variableIncomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === selectedMonth && incomeDate.getFullYear() === selectedYear;
    });
  }, [variableIncomes, selectedMonth, selectedYear]);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleRequestDelete = (income: Transaction) => {
    setIncomeToDelete(income);
  };

  const handleCancelDelete = () => {
    setIncomeToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (incomeToDelete) {
      deleteTransactionMutation.mutate(incomeToDelete.id);
      setIncomeToDelete(null);
    }
  };

  const confirmationMessage = "Você tem certeza que deseja excluir esta renda? Esta ação não pode ser desfeita.";
  
  const handleOpenCreateModal = () => {
    setEditingIncome(null);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (income: VariableIncomeType) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };
  
  const handleModalSubmit = (formData: IncomeFormData) => {
    const localDateObject = parseDateInputToLocal(formData.date);
    const utcTimestamp = convertDateToUTCISOString(localDateObject);

    const transactionData = {
      description: formData.description,
      amount: formData.amount,
      date: utcTimestamp,
      categoryId: formData.categoryId,
      type: 'income' as const
    };

    const mutationOptions = {
      onSuccess: () => {
        setIsModalOpen(false);
      }
    };

    if (editingIncome) {
      updateTransactionMutation.mutate({id: editingIncome.id, data: transactionData}, mutationOptions);
    } else {
      addTransactionMutation.mutate(transactionData, mutationOptions);
    }
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  
  const getCategory = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Header e Filtros sempre visíveis */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Variáveis</h1>
        <div className="flex items-center space-x-2">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {months.map((month, index) => <option key={index} value={index}>{month}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button onClick={handleOpenCreateModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Renda
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
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-48" /></td> {/* Descrição */}
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-24 rounded-full" /></td> {/* Categoria */}
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td> {/* Valor */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-5 h-5 rounded" /> {/* Botão Editar */}
                      <Skeleton className="w-5 h-5 rounded" /> {/* Botão Excluir */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filteredIncomes.length > 0 ? (
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
              {filteredIncomes.map(income => {
                const category = getCategory('categoryId' in income ? income.categoryId : undefined);
                return (
                  <tr key={income.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatUTCToDDMMAAAA(income.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                          {category.name}
                        </span>
                       ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatValue(income.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => handleOpenEditModal(income)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(income)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
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
            Nenhuma renda variável para o período selecionado.
          </div>
        )}
      </div>
      
      {/* Modais mantidos */}
      <IncomeModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingIncome}
        isLoading={isSaving}
      />
      
      <ConfirmationModal
        isOpen={!!incomeToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message={confirmationMessage}
      />
    </div>
  );
};