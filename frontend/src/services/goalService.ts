import { api } from './api';
import type { Goal, GoalContribution } from '../types/FinanceTypes';

export type GoalInput = { name: string; target: number; deadline: string | null };

export const goalService = {
  list: async (): Promise<Goal[]> => (await api.get<Goal[]>('/goals')).data,
  create: async (input: GoalInput & { initial?: number }): Promise<Goal> => (await api.post<Goal>('/goals', input)).data,
  update: async (id: string, input: Partial<GoalInput>): Promise<Goal> => (await api.put<Goal>(`/goals/${id}`, input)).data,
  remove: async (id: string) => (await api.delete(`/goals/${id}`)).data,
  contribute: async (id: string, input: { amount: number; date: string; sourceMonth?: string | null }): Promise<GoalContribution> =>
    (await api.post<GoalContribution>(`/goals/${id}/contributions`, input)).data,
  removeContribution: async (id: string, contributionId: string) => (await api.delete(`/goals/${id}/contributions/${contributionId}`)).data,
};
