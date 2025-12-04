import React from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon, CalendarIcon } from 'lucide-react';
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { FixedIncomeModal } from '../../components/Income/FixedIncomeModal';
import { ArchiveModal } from '../../components/Shared/ArchiveModal';
import { VariationModal } from '../../components/Shared/VariationModal';
import { formatUTCToDDMMAAAA } from '../../utils/dateUtils';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { Skeleton } from '../../components/Shared/Skeleton';
import { useFixedIncomePage } from '../../hooks/useFixedIncomePage';

export const FixedIncome: React.FC = () => {
  // 1. Hook que contém toda a lógica da página
  const {
    isLoading, activeIncomes, archivedIncomes, monthlyVariations,
    isFormModalOpen, setIsFormModalOpen,
    editingIncome,
    isArchiveModalOpen, setIsArchiveModalOpen,
    isVariationModalOpen,
    selectedIncomeForVariation,
    incomeToDelete, setIncomeToDelete,
    isSaving,
    openCreateModal, openEditModal, openVariationModal, closeVariationModal,
    handleModalSubmit, handleVariationSubmit, handleRequestDelete, handleConfirmDelete, handleEditArchived,
    getCategory, getVariationsForIncome
  } = useFixedIncomePage();

  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatMonthYear = (month: number, year: number) => new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const archiveColumns = [
    { key: 'description' as const, label: 'Descrição' },
    { key: 'amount' as const, label: 'Valor' },
    { key: 'period' as const, label: 'Período' },
    { key: 'actions' as const, label: 'Ações' },
  ];

  const archivedIncomesData = activeIncomes ? archivedIncomes.map(income => ({
    ...income,
    endDate: income.endDate!,
    category: getCategory(income.categoryId),
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header sempre visível */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Fixas</h1>
        <div className="flex items-center space-x-2">
          {!isLoading && archivedIncomes.length > 0 && (
            <button onClick={() => setIsArchiveModalOpen(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md flex items-center text-sm">
              <ArchiveIcon className="w-4 h-4 mr-2" />
              Ver Arquivadas ({archivedIncomes.length})
            </button>
          )}
          <button onClick={openCreateModal} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm">
            <PlusIcon className="w-4 h-4 mr-2" />
            Nova Renda Fixa
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          // 1. LOADING STATE: Tabela com Skeletons
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Descrição', 'Categoria', 'Valor Padrão', 'Valor Atual', 'Dia Receb.', 'Período', 'Ações'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeIncomes.length > 0 ? (
          // 2. DATA STATE: Tabela Real
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Padrão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Atual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dia do Recebimento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeIncomes.map(income => {
                const category = getCategory(income.categoryId);
                const currentAmount = getActualFixedItemAmount(income.id, 'income', new Date().getFullYear(), new Date().getMonth(), income.amount, monthlyVariations);
                return (
                  <tr key={income.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.name}</span> : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{formatValue(income.amount)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${currentAmount !== income.amount ? 'text-blue-600' : 'text-green-600'}`}>
                      {formatValue(currentAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Dia {income.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatUTCToDDMMAAAA(income.startDate)}
                      {income.endDate ? ` até ${formatUTCToDDMMAAAA(income.endDate)}` : ' (contínua)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => openVariationModal(income)} className="text-blue-600 hover:text-blue-900" title="Adicionar variação mensal"><CalendarIcon className="w-5 h-5" /></button>
                        <button onClick={() => openEditModal(income)} className="text-blue-600 hover:text-blue-900" title="Editar renda fixa"><PencilIcon className="w-5 h-5" /></button>
                        <button onClick={() => handleRequestDelete(income)} className="text-red-600 hover:text-red-900" title="Remover renda fixa"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          // 3. EMPTY STATE
          <div className="px-6 py-8 text-center text-gray-500">Nenhuma renda fixa ativa cadastrada.</div>
        )}
      </div>
      
      {/* Modais */}
      <FixedIncomeModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialData={editingIncome}
        isLoading={isSaving}
      />
      
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Rendas Fixas Arquivadas"
        items={archivedIncomesData}
        columns={archiveColumns}
        formatValue={formatValue}
        formatDate={formatUTCToDDMMAAAA}
        onEdit={handleEditArchived}
      />

      {selectedIncomeForVariation && (
        <VariationModal
          isOpen={isVariationModalOpen}
          onClose={closeVariationModal}
          onSubmit={handleVariationSubmit}
          itemDescription={selectedIncomeForVariation.description}
          defaultAmount={selectedIncomeForVariation.amount}
          existingVariations={getVariationsForIncome(selectedIncomeForVariation.id)}
          formatValue={formatValue}
          formatMonthYear={formatMonthYear}
        />
      )}

      <ConfirmationModal
        isOpen={!!incomeToDelete}
        onClose={() => setIncomeToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Deseja encerrar esta renda fixa?"
        message="A partir de hoje, esta renda não será mais lançada. Os registros de recebimentos anteriores não serão afetados."
      />
    </div>
  );
};