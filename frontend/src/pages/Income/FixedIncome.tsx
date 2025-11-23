import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveIcon, CalendarIcon } from 'lucide-react';
import {FixedIncome as FixedIncomeType} from '../../types/FinanceTypes'
import { ConfirmationModal } from '../../components/Shared/ConfirmationModal';
import { FixedIncomeModal, FixedIncomeFormData } from '../../components/Income/FixedIncomeModal';
import { ArchiveModal } from '../../components/Shared/ArchiveModal';
import { VariationModal } from '../../components/Shared/VariationModal';
import { formatUTCToDDMMAAAA, convertDateToUTCISOString, parseDateInputToLocal } from '../../utils/dateUtils';
import { getActualFixedItemAmount } from '../../utils/financeUtils';
import { useFixedIncomes, useAddFixedIncome, useUpdateFixedIncome, useDeleteFixedIncome } from '../../hooks/useFixedTransactions';
import { useMonthlyVariations, useAddMonthlyVariation, useDeleteMonthlyVariation, useUpdateMonthlyVariation } from '../../hooks/useMonthlyVariations';
import { useCategories } from '../../hooks/useCategories';
import { Skeleton } from '../../components/Shared/Skeleton';


export const FixedIncome: React.FC = () => {
  // 1. Leitura de Dados (Hooks)
  const { data: fixedIncomes = [], isLoading: isLoadingIncomes } = useFixedIncomes();
  const { data : categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  const isLoading = isLoadingIncomes || isLoadingCategories || isLoadingMonthlyVariations;

  // 2. Mutações (Escrita)
  const addIncomeMutation = useAddFixedIncome();
  const updateIncomeMutation = useUpdateFixedIncome();
  const deleteIncomeMutation = useDeleteFixedIncome();
  
  const addVariationMutation = useAddMonthlyVariation();
  const updateVariationMutation = useUpdateMonthlyVariation();
  const deleteVariationMutation = useDeleteMonthlyVariation();
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FixedIncomeType | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedIncomeForVariation, setSelectedIncomeForVariation] = useState<FixedIncomeType | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<FixedIncomeType | null>(null);

  const [numericVariationAmount, setNumericVariationAmount] = useState<number | null>(null);

  const { activeIncomes, archivedIncomes } = useMemo(() => {
    const today = new Date();
    const active: FixedIncomeType[] = [];
    const archived: FixedIncomeType[] = [];
    fixedIncomes.forEach(income => {
      const isArchived = income.endDate && new Date(income.endDate) <= today;
      if (isArchived) {
        archived.push(income);
      } else {
        active.push(income);
      }
    });
    return { activeIncomes: active, archivedIncomes: archived };
  }, [fixedIncomes]);

  const isSaving = addIncomeMutation.isPending || updateIncomeMutation.isPending;

  const openCreateModal = () => {
    setEditingIncome(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (income: FixedIncomeType) => {
    setEditingIncome(income);
    setIsFormModalOpen(true);
  };
  
  const openVariationModal = (income: FixedIncomeType) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentVariation = monthlyVariations.find(v => v.fixedItemId === income.id && v.type === 'income' && v.year === currentYear && v.month === currentMonth);

    setSelectedIncomeForVariation(income);
    const initialAmount = currentVariation ? currentVariation.amount : income.amount;
    setNumericVariationAmount(initialAmount)
    setIsVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setIsVariationModalOpen(false);
    setSelectedIncomeForVariation(null);
  };

  const handleModalSubmit = (formData: FixedIncomeFormData) => {
    const incomeData = {
      ...formData,
      type: 'income' as const,
      startDate: convertDateToUTCISOString(parseDateInputToLocal(formData.startDate)),
      endDate: formData.endDate ? convertDateToUTCISOString(parseDateInputToLocal(formData.endDate)) : null,
    };

    const mutationOptions = {
      onSuccess: () => {
        setIsFormModalOpen(false);
      }
    };

    if (editingIncome) {
      updateIncomeMutation.mutate({id: editingIncome.id, data: incomeData}, mutationOptions);
    } else {
      addIncomeMutation.mutate(incomeData, mutationOptions);
    }
  };
  
  const handleVariationSubmit = (data: { year: number, month: number, amount: number }) => {
    if (!selectedIncomeForVariation || numericVariationAmount === null) return;
    const { year, month, amount } = data;
    const existingVariation = monthlyVariations.find(v => v.fixedItemId === selectedIncomeForVariation.id && v.type === 'income' && v.year === year && v.month === month);

    if (amount === selectedIncomeForVariation.amount) {
      if (existingVariation) {
        deleteVariationMutation.mutate(existingVariation.id);
      }
    } else {
      if (existingVariation) {
        updateVariationMutation.mutate({
          id: existingVariation.id,
          fixedItemId: selectedIncomeForVariation.id,
          amount: amount,
          year: year,
          month: month,
          type: 'income'
        });
      } else {
        addVariationMutation.mutate({
          fixedItemId: selectedIncomeForVariation.id,
          type: 'income',
          year,
          month,
          amount
        });
      }
    }
    setIsVariationModalOpen(false);
  };

  const handleRequestDelete = (income: FixedIncomeType) => {
    setIncomeToDelete(income);
  };
  
  const handleConfirmDelete = () => {
    if (incomeToDelete) {
      deleteIncomeMutation.mutate(incomeToDelete.id);
      setIncomeToDelete(null);
    }
  };

  const handleEditArchived = (income: FixedIncomeType) => {
    setIsArchiveModalOpen(false);
    openEditModal(income);
  };

  const getCategory = (categoryId?: string) => categories.find(c => c.id === categoryId);
  const formatValue = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatMonthYear = (month: number, year: number) => new Date(year, month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const getVariationsForIncome = (incomeId: string) => monthlyVariations.filter(v => v.fixedItemId === incomeId && v.type === 'income').sort((a, b) => b.year - a.year || b.month - a.month);

  const archiveColumns: { 
    key: keyof FixedIncomeType | 'category' | 'period' | 'actions'; 
    label: string 
  }[] = [
    { key: 'description', label: 'Descrição' },
    { key: 'amount', label: 'Valor' },
    { key: 'period', label: 'Período' },
    { key: 'actions', label: 'Ações' },
  ];

  const archivedIncomesData = useMemo(() => {
    return archivedIncomes.map(income => ({
      ...income,
      endDate: income.endDate!,
      category: getCategory(income.categoryId),
    }));
  }, [archivedIncomes, categories]);

  return (
    <div className="space-y-6">
      {/* Header sempre visível */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Rendas Fixas</h1>
        <div className="flex items-center space-x-2">
          {/* Botão Arquivadas (só aparece se tiver dados E não estiver carregando, ou pode deixar visível desabilitado) */}
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Padrão</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Atual</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia do Recebimento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="w-5 h-5 rounded" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeIncomes.length > 0 ? (
          // 2. DATA STATE: Tabela Real
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Padrão</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Atual</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dia do Recebimento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
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
      
      {/* Modais (Mantidos igual) */}
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