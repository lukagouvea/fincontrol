import React from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon, CalendarIcon } from 'lucide-react';
import { FixedExpense as FixedExpenseType } from '../../types/FinanceTypes';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { FixedExpenseModal } from '../../components/Expenses/FixedExpenseModal';
import { ArchiveModal } from '../../components/Shared/ArchiveModal';
import { VariationModal } from '../../components/Shared/VariationModal';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { formatUTCToDDMMAAAA } from '../../utils/dateUtils';
import { Skeleton } from '../../components/Shared/Skeleton';
import { useFixedExpensesPage } from '../../hooks/useFixedExpensesPage';

export const FixedExpenses: React.FC = () => {
  // 1. Hook que contém toda a lógica da página
  const {
    isLoading, activeExpenses, archivedExpenses, monthlyVariations,
    isFormModalOpen, setIsFormModalOpen,
    editingExpense,
    isArchiveModalOpen, setIsArchiveModalOpen,
    isVariationModalOpen,
    selectedExpenseForVariation,
    expenseToDelete, setExpenseToDelete,
    isSaving,
    openCreateModal, openEditModal, openVariationModal, closeVariationModal,
    handleModalSubmit, handleVariationSubmit, handleRequestDelete, handleConfirmDelete, handleEditArchived,
    getCategory, getVariationsForExpense
  } = useFixedExpensesPage();

  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatMonthYear = (month: number, year: number) => new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const archiveColumns = [
    { key: 'description' as const, label: 'Descrição' },
    { key: 'amount' as const, label: 'Valor' },
    { key: 'period' as const, label: 'Período' },
    { key: 'actions' as const, label: 'Ações' },
  ];

  const archivedExpensesData = activeExpenses ? archivedExpenses.map(expense => ({
    ...expense,
    endDate: expense.endDate!,
    category: getCategory(expense.categoryId),
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Despesas Fixas</h1>
        <div className="flex items-center space-x-2">
          {!isLoading && archivedExpenses.length > 0 && (
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
      
      {/* Tabela Principal */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Descrição', 'Categoria', 'Valor Padrão', 'Valor Atual', 'Dia Venc.', 'Período', 'Ações'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeExpenses.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Padrão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Atual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dia do Vencimento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeExpenses.map(expense => {
                const category = getCategory(expense.categoryId);
                const currentAmount = getActualFixedItemAmount(
                  expense.id, 'expense', new Date().getFullYear(), new Date().getMonth(), expense.amount, monthlyVariations
                );
                return (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 text-sm">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatValue(expense.amount)}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${currentAmount !== expense.amount ? 'text-blue-600' : 'text-gray-900'}`}>{formatValue(currentAmount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Dia {expense.day}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatUTCToDDMMAAAA(expense.startDate)}
                      {expense.endDate ? ` até ${formatUTCToDDMMAAAA(expense.endDate)}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openVariationModal(expense)} className="text-blue-600 hover:text-blue-900"><CalendarIcon className="w-5 h-5" /></button>
                        <button onClick={() => openEditModal(expense)} className="text-blue-600 hover:text-blue-900"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(expense)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5" /></button>
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
      
      {/* Modais */}
      <FixedExpenseModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingExpense}
        isLoading={isSaving}
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