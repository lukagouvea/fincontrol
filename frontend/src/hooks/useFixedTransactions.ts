import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedTransactionService } from '../services/fixedTransactionService';
import { FixedExpense, FixedIncome } from '../types/FinanceTypes';

const CACHE_KEY_FIXED_EXPENSES = ['fixed-expenses'];
const CACHE_KEY_FIXED_INCOMES = ['fixed-incomes'];

// ==============================
// DESPESAS FIXAS
// ==============================

export const useFixedExpenses = () => {
  return useQuery({
    queryKey: CACHE_KEY_FIXED_EXPENSES,
    queryFn: fixedTransactionService.getExpenses,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddFixedExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fixedTransactionService.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_EXPENSES });
    },
  });
};

export const useUpdateFixedExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedExpense> }) =>
      fixedTransactionService.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_EXPENSES });
    },
  });
};

export const useDeleteFixedExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fixedTransactionService.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_EXPENSES });
    },
  });
};

// ==============================
// RENDAS FIXAS
// ==============================

export const useFixedIncomes = () => {
  return useQuery({
    queryKey: CACHE_KEY_FIXED_INCOMES,
    queryFn: fixedTransactionService.getIncomes,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddFixedIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fixedTransactionService.createIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_INCOMES });
    },
  });
};

export const useUpdateFixedIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedIncome> }) =>
      fixedTransactionService.updateIncome(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_INCOMES });
    },
  });
};

export const useDeleteFixedIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fixedTransactionService.deleteIncome,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_FIXED_INCOMES });
    },
  });
};