import { useState, useMemo } from 'react';
import { FixedExpense as FixedExpenseType } from '../types/FinanceTypes';
import { FixedExpenseFormData } from '../components/Expenses/FixedExpenseModal';
import { convertDateToUTCISOString, parseDateInputToLocal } from '../utils/dateUtils';
import { useFixedExpenses, useAddFixedExpense, useUpdateFixedExpense, useDeleteFixedExpense } from './useFixedTransactions';
import { useMonthlyVariations, useAddMonthlyVariation, useUpdateMonthlyVariation, useDeleteMonthlyVariation } from './useMonthlyVariations';
import { useCategories } from './useCategories';

export const useFixedExpensesPage = () => {
  // 1. Leitura de Dados
  const { data: fixedExpenses = [], isLoading: isLoadingExpenses } = useFixedExpenses();
  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const { data: monthlyVariations = [], isLoading: isLoadingMonthlyVariations } = useMonthlyVariations();

  const isLoading = isLoadingExpenses || isLoadingCategories || isLoadingMonthlyVariations;

  // 2. Mutações
  const addExpenseMutation = useAddFixedExpense();
  const updateExpenseMutation = useUpdateFixedExpense();
  const deleteExpenseMutation = useDeleteFixedExpense();
  
  const addVariationMutation = useAddMonthlyVariation();
  const updateVariationMutation = useUpdateMonthlyVariation();
  const deleteVariationMutation = useDeleteMonthlyVariation();

  const isSaving = addExpenseMutation.isPending || updateExpenseMutation.isPending;

  // 3. Estados Locais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpenseType | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedExpenseForVariation, setSelectedExpenseForVariation] = useState<FixedExpenseType | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<FixedExpenseType | null>(null);
  const [numericVariationAmount, setNumericVariationAmount] = useState<number | null>(null);

  // 4. Lógica de Filtragem (Ativos vs Arquivados)
  const { activeExpenses, archivedExpenses } = useMemo(() => {
    const today = new Date();
    const active: FixedExpenseType[] = [];
    const archived: FixedExpenseType[] = [];
    fixedExpenses.forEach(expense => {
      const isArchived = expense.endDate && new Date(expense.endDate) <= today;
      if (isArchived) {
        archived.push(expense);
      } else {
        active.push(expense);
      }
    });
    return { activeExpenses: active, archivedExpenses: archived };
  }, [fixedExpenses]);

  // 5. Handlers (Ações)
  const openCreateModal = () => {
    setEditingExpense(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (expense: FixedExpenseType) => {
    setEditingExpense(expense);
    setIsFormModalOpen(true);
  };

  const openVariationModal = (expense: FixedExpenseType) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentVariation = monthlyVariations.find(v => v.fixedItemId === expense.id && v.type === 'expense' && v.year === currentYear && v.month === currentMonth);
    
    setSelectedExpenseForVariation(expense);
    const initialAmount = currentVariation ? currentVariation.amount : expense.amount;
    setNumericVariationAmount(initialAmount);
    setIsVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setIsVariationModalOpen(false);
    setSelectedExpenseForVariation(null);
  };

  const handleModalSubmit = (formData: FixedExpenseFormData) => {
    const expenseData = {
      ...formData,
      type: 'expense' as const,
      startDate: convertDateToUTCISOString(parseDateInputToLocal(formData.startDate)),
      endDate: formData.endDate ? convertDateToUTCISOString(parseDateInputToLocal(formData.endDate)) : null,
    };

    const mutationOptions = {
      onSuccess: () => setIsFormModalOpen(false)
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data: expenseData }, mutationOptions);
    } else {
      addExpenseMutation.mutate(expenseData, mutationOptions);
    }
  };

  const handleVariationSubmit = (data: { year: number, month: number, amount: number }) => {
    if (!selectedExpenseForVariation || numericVariationAmount === null) return;

    const { year, month, amount } = data;
    const existingVariation = monthlyVariations.find(v => v.fixedItemId === selectedExpenseForVariation.id && v.type === 'expense' && v.year === year && v.month === month);

    if (amount === selectedExpenseForVariation.amount) {
      if (existingVariation) {
        deleteVariationMutation.mutate(existingVariation.id);
      }
    } else {
      if (existingVariation) {
        updateVariationMutation.mutate({
          id: existingVariation.id,
          fixedItemId: selectedExpenseForVariation.id,
          amount: amount,
          year: year,
          month: month,
          type: 'expense'
        });
      } else {
        addVariationMutation.mutate({
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

  const handleRequestDelete = (expense: FixedExpenseType) => setExpenseToDelete(expense);
  
  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  const handleEditArchived = (expense: FixedExpenseType) => {
    setIsArchiveModalOpen(false);
    openEditModal(expense);
  };

  // Helpers de visualização
  const getCategory = (categoryId: string) => categories.find(c => c.id === categoryId);
  const getVariationsForExpense = (expenseId: string) => monthlyVariations.filter(v => v.fixedItemId === expenseId && v.type === 'expense').sort((a, b) => b.year - a.year || b.month - a.month);

  return {
    // Dados
    isLoading,
    activeExpenses,
    archivedExpenses,
    monthlyVariations,
    // Estados do Modal
    isFormModalOpen, setIsFormModalOpen,
    editingExpense,
    isArchiveModalOpen, setIsArchiveModalOpen,
    isVariationModalOpen,
    selectedExpenseForVariation,
    expenseToDelete, setExpenseToDelete,
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
    getVariationsForExpense
  };
};