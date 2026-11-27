import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalService, type GoalInput } from '../services/goalService';

export const GOALS_KEY = ['goals'];

export const useGoals = () => useQuery({ queryKey: GOALS_KEY, queryFn: goalService.list, staleTime: 1000 * 60 * 5 });

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: GOALS_KEY });
}

export const useCreateGoal = () => {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: goalService.create, onSuccess });
};
export const useUpdateGoal = () => {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<GoalInput> }) => goalService.update(id, data), onSuccess });
};
export const useDeleteGoal = () => {
  const onSuccess = useInvalidate();
  return useMutation({ mutationFn: goalService.remove, onSuccess });
};
export const useContribute = () => {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: ({ goalId, amount, date, sourceMonth }: { goalId: string; amount: number; date: string; sourceMonth?: string | null }) =>
      goalService.contribute(goalId, { amount, date, sourceMonth }),
    onSuccess,
  });
};
export const useRemoveContribution = () => {
  const onSuccess = useInvalidate();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) => goalService.removeContribution(goalId, contributionId),
    onSuccess,
  });
};
