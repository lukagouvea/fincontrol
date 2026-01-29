import { api } from './api';

export type InvestmentDefaultResponse = {
  defaultMonthlyAmount: number;
};

export type InvestmentEffectiveResponse = {
  defaultMonthlyAmount: number;
  overrideMonthlyAmount: number | null;
  effectiveMonthlyAmount: number;
};

export const investmentService = {
  getDefault: async (): Promise<InvestmentDefaultResponse> => {
    const { data } = await api.get<InvestmentDefaultResponse>('/investment');
    return data;
  },

  updateDefault: async (defaultMonthlyAmount: number): Promise<InvestmentDefaultResponse> => {
    const { data } = await api.put<InvestmentDefaultResponse>('/investment', { defaultMonthlyAmount });
    return data;
  },

  getEffective: async (month: number, year: number): Promise<InvestmentEffectiveResponse> => {
    const { data } = await api.get<InvestmentEffectiveResponse>('/investment/effective', {
      params: { month: month + 1, year },
    });
    return data;
  },

  setOverride: async (month: number, year: number, amount: number): Promise<void> => {
    await api.put('/investment/override', {
      month: month + 1,
      year,
      amount,
    });
  },

  clearOverride: async (month: number, year: number): Promise<void> => {
    await api.delete('/investment/override', {
      params: { month: month + 1, year },
    });
  },
};
