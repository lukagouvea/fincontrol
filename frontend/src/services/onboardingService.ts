import { api } from './api';

export const onboardingService = {
  /** Conclui a configuração inicial; `budget` vira o limite "Geral" do mês. */
  complete: async (budget: number | null): Promise<{ categoriesCreated: number; onboardingCompletedAt: string }> =>
    (await api.post('/onboarding/complete', { budget })).data,
};
