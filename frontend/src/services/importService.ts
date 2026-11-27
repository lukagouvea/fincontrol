import { api } from './api';

export type ImportItem = { date: string; description: string; amount: number; type: 'income' | 'expense'; categoryId: string };

export const importService = {
  create: async (input: { fileName: string; cardId: string | null; items: ImportItem[] }): Promise<{ id: string; count: number; total: number }> =>
    (await api.post('/imports', input)).data,
  undo: async (id: string): Promise<{ deleted: number }> => (await api.delete(`/imports/${id}`)).data,
};
