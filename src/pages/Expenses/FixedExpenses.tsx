import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon, CalendarIcon } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { FixedExpense as FixedExpenseType } from '../../types/FinanceTypes';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { FixedExpenseModal, FixedExpenseFormData } from '../../components/Expenses/FixedExpenseModal';
import { ArchiveModal } from '../../components/Shared/ArchiveModal';
import { VariationModal } from '../../components/Shared/VariationModal';
import { formatUTCToDDMMAAAA, convertDateToUTCISOString, parseDateInputToLocal } from '../../utils/dateUtils';

export const FixedExpenses: React.FC = () => {
  const {
    fixedExpenses,
    categories,
    monthlyVariations,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addMonthlyVariation,
    updateMonthlyVariation,
    deleteMonthlyVariation,
    getActualFixedItemAmount
  } = useFinance();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpenseType | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedExpenseForVariation, setSelectedExpenseForVariation] = useState<FixedExpenseType | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<FixedExpenseType | null>(null);

  const { activeExpenses, archivedExpenses } = useMemo(() => {
    const today = new Date();
    const active: FixedExpenseType[] = [];
    const archived: FixedExpenseType[] = [];
    fixedExpenses.forEach(expense => {
      const isArchived = expense.endDate && parseDateInputToLocal(expense.endDate.split('T')[0]) < today;
      if (isArchived) {
        archived.push(expense);
      } else {
        active.push(expense);
      }
    });
    return { activeExpenses: active, archivedExpenses: archived };
  }, [fixedExpenses]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (expense: FixedExpenseType) => {
    setEditingExpense(expense);
    setIsFormModalOpen(true);
  };
  
  const openVariationModal = (expense: FixedExpenseType) => {
    setSelectedExpenseForVariation(expense);
    setIsVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setIsVariationModalOpen(false);
    setSelectedExpenseForVariation(null);
  };

  const handleModalSubmit = (formData: FixedExpenseFormData) => {
    const expenseData = {
      ...formData,
      startDate: convertDateToUTCISOString(parseDateInputToLocal(formData.startDate)),
      endDate: formData.endDate ? convertDateToUTCISOString(parseDateInputToLocal(formData.endDate)) : undefined,
    };
    if (editingExpense) {
      updateFixedExpense(editingExpense.id, expenseData);
    } else {
      addFixedExpense(expenseData);
    }
    setIsFormModalOpen(false);
  };
  
  const handleVariationSubmit = (data: { year: number, month: number, amount: number }) => {
    if (!selectedExpenseForVariation) return;
    const { year, month, amount } = data;
    const existingVariation = monthlyVariations.find(v => v.fixedItemId === selectedExpenseForVariation.id && v.type === 'expense' && v.year === year && v.month === month);

    if (amount === selectedExpenseForVariation.amount) {
      if (existingVariation) {
        deleteMonthlyVariation(existingVariation.id);
      }
    } else {
      if (existingVariation) {
        updateMonthlyVariation(existingVariation.id, { amount });
      } else {
        addMonthlyVariation({
          fixedItemId: selectedExpenseForVariation.id,
          type: 'expense',
          year,
          month,
          amount
        });
      }
    }
    setIsVariationModalOpen(false);
  };

  const handleRequestDelete = (expense: FixedExpenseType) => {
    setExpenseToDelete(expense);
  };
  
  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteFixedExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  const handleEditArchived = (expense: FixedExpenseType) => {
    setIsArchiveModalOpen(false);
    openEditModal(expense);
  };

  const getCategory = (categoryId: string) => categories.find(c => c.id === categoryId);
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatMonthYear = (month: number, year: number) => new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const getVariationsForExpense = (expenseId: string) => monthlyVariations.filter(v => v.fixedItemId === expenseId && v.type === 'expense').sort((a, b) => b.year - a.year || b.month - a.month);

  const archiveColumns: { 
    key: keyof FixedExpenseType | 'category' | 'period' | 'actions'; 
    label: string 
  }[] = [
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor' },
    { key: 'period', label: 'Período' },
    { key: 'actions', label: 'Ações' },
  ];

  const archivedExpensesData = useMemo(() => {
    return archivedExpenses.map(expense => ({
      ...expense,
      endDate: expense.endDate!,
      category: getCategory(expense.categoryId),
    }));
  }, [archivedExpenses, categories]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Fixas</h1>
        <div className="flex items-center space-x-2">
          {archivedExpenses.length > 0 && (
            <button onClick={() => setIsArchiveModalOpen(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm">
              <ArchiveIcon className="w-4 h-4 mr-2" />
              Ver Arquivadas ({archivedExpenses.length})
            </button>
          )}
          <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Despesa Fixa
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {activeExpenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Padrão</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Atual</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia do Vencimento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                const currentAmount = getActualFixedItemAmount(expense.id, 'expense', new Date().getFullYear(), new Date().getMonth(), expense.amount);
                return (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatValue(expense.amount)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${currentAmount !== expense.amount ? 'text-blue-600' : 'text-gray-900'}`}>{formatValue(currentAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {expense.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatUTCToDDMMAAAA(expense.startDate)}
                      {expense.endDate ? ` até ${formatUTCToDDMMAAAA(expense.endDate)}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openVariationModal(expense)} className="text-blue-600 hover:text-blue-900" title="Adicionar variação mensal"><CalendarIcon className="w-5 h-5" /></button>
                        <button onClick={() => openEditModal(expense)} className="text-blue-600 hover:text-blue-900" title="Editar despesa fixa"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(expense)} className="text-red-600 hover:text-red-900" title="Remover despesa fixa"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">Nenhuma despesa fixa ativa cadastrada.</div>
        )}
      </div>
      
      <FixedExpenseModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingExpense}
      />
      
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Despesas Fixas Arquivadas"
        items={archivedExpensesData}
        columns={archiveColumns}
        formatValue={formatValue}
        formatDate={formatUTCToDDMMAAAA}
        onEdit={handleEditArchived}
      />

      {selectedExpenseForVariation && (
        <VariationModal
          isOpen={isVariationModalOpen}
          onClose={closeVariationModal}
          onSubmit={handleVariationSubmit}
          itemDescription={selectedExpenseForVariation.description}
          defaultAmount={selectedExpenseForVariation.amount}
          existingVariations={getVariationsForExpense(selectedExpenseForVariation.id)}
          formatValue={formatValue}
          formatMonthYear={formatMonthYear}
        />
      )}

      <ConfirmationModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Deseja encerrar esta despesa fixa?"
        message="A partir de hoje, esta despesa não será mais lançada. Os registros de pagamentos anteriores não serão afetados."
      />
    </div>
  );
};