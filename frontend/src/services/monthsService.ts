import { api } from './api';

export const monthsService = {
  /** Marca a virada do mês fechado ('YYYY-MM') como vista. */
  seen: async (month: string): Promise<{ lastClosingSeen: string }> => (await api.post(`/months/${month}/seen`)).data,
};
