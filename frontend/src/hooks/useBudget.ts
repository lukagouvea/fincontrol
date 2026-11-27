import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '../services/budgetService';

export const BUDGET_KEY = ['budgets'];

export const useBudgetLimits = () =>
  useQuery({ queryKey: BUDGET_KEY, queryFn: budgetService.list, staleTime: 1000 * 60 * 5 });

export const useSaveBudget = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ month, repeat, limits }: { month: string; repeat: boolean; limits: Array<{ categoryId: string | null; amount: number | null }> }) =>
      budgetService.save(month, repeat, limits),
    onSuccess: () => client.invalidateQueries({ queryKey: BUDGET_KEY }),
  });
};
