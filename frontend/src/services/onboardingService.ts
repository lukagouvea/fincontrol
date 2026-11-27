import { api } from './api';

export const onboardingService = {
  /** Conclui a configuração inicial; `budget` vira o limite "Geral" do mês local atual. */
  complete: async (budget: number | null, today = new Date()): Promise<{ categoriesCreated: number; onboardingCompletedAt: string }> => {
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return (await api.post('/onboarding/complete', { budget, month })).data;
  },
};
