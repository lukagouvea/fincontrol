import { useState, useMemo } from 'react';
import { FixedIncome as FixedIncomeType } from '../types/FinanceTypes';
import { FixedIncomeFormData } from '../components/Income/FixedIncomeModal';
import { convertDateToUTCISOString, parseDateInputToLocal } from '../utils/dateUtils';
import { useFixedIncomes, useAddFixedIncome, useUpdateFixedIncome, useDeleteFixedIncome } from './useFixedTransactions';
import { useMonthlyVariations, useAddMonthlyVariation, useDeleteMonthlyVariation, useUpdateMonthlyVariation } from './useMonthlyVariations';
import { useCategories } from './useCategories';

export const useFixedIncomePage = () => {
  // 1. Leitura de Dados
  const { data: fixedIncomes = [], isLoading: isLoadingIncomes } = useFixedIncomes();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  const isLoading = isLoadingIncomes || isLoadingCategories || isLoadingMonthlyVariations;

  // 2. Mutações
  const addIncomeMutation = useAddFixedIncome();
  const updateIncomeMutation = useUpdateFixedIncome();
  const deleteIncomeMutation = useDeleteFixedIncome();
  
  const addVariationMutation = useAddMonthlyVariation();
  const updateVariationMutation = useUpdateMonthlyVariation();
  const deleteVariationMutation = useDeleteMonthlyVariation();

  const isSaving = addIncomeMutation.isPending || updateIncomeMutation.isPending;

  // 3. Estados Locais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FixedIncomeType | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedIncomeForVariation, setSelectedIncomeForVariation] = useState<FixedIncomeType | null>(null);
  const [incomeToDelete, setIncomeToDelete] = useState<FixedIncomeType | null>(null);
  const [numericVariationAmount, setNumericVariationAmount] = useState<number | null>(null);

  // 4. Lógica de Filtragem (Ativos vs Arquivados)
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

  // 5. Handlers (Ações)
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
    setNumericVariationAmount(initialAmount);
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
      onSuccess: () => setIsFormModalOpen(false)
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

  const handleRequestDelete = (income: FixedIncomeType) => setIncomeToDelete(income);
  
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

  // Helpers
  const getCategory = (categoryId?: string) => categories.find(c => c.id === categoryId);
  const getVariationsForIncome = (incomeId: string) => monthlyVariations.filter(v => v.fixedItemId === incomeId && v.type === 'income').sort((a, b) => b.year - a.year || b.month - a.month);

  return {
    // Dados
    isLoading,
    activeIncomes,
    archivedIncomes,
    monthlyVariations,
    // Estados
    isFormModalOpen, setIsFormModalOpen,
    editingIncome,
    isArchiveModalOpen, setIsArchiveModalOpen,
    isVariationModalOpen,
    selectedIncomeForVariation,
    incomeToDelete, setIncomeToDelete,
    isSaving,
    // Ações
    openCreateModal,
    openEditModal,
    openVariationModal,
    closeVariationModal,
    handleModalSubmit,
    handleVariationSubmit,
    handleRequestDelete,
    handleConfirmDelete,
    handleEditArchived,
    // Helpers
    getCategory,
    getVariationsForIncome
  };
};