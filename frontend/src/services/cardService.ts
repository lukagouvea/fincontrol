import { api } from './api';
import type { Card, CardColor, CardPayment, Transaction } from '../types/FinanceTypes';

export type CardInput = {
  name: string;
  last4: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: CardColor;
};

export const cardService = {
  list: async (): Promise<Card[]> => (await api.get<Card[]>('/cards')).data,
  create: async (input: CardInput): Promise<Card> => (await api.post<Card>('/cards', input)).data,
  update: async (id: string, input: Partial<CardInput> & { archived?: boolean }): Promise<Card> =>
    (await api.put<Card>(`/cards/${id}`, input)).data,
  remove: async (id: string): Promise<{ deleted?: boolean; archived?: boolean }> => (await api.delete(`/cards/${id}`)).data,
  addPayment: async (id: string, payment: Omit<CardPayment, 'id'>): Promise<CardPayment> =>
    (await api.post<CardPayment>(`/cards/${id}/payments`, payment)).data,
  removePayment: async (id: string, paymentId: string): Promise<void> => {
    await api.delete(`/cards/${id}/payments/${paymentId}`);
  },
  transactions: async (id: string): Promise<Transaction[]> =>
    (await api.get<Transaction[]>(`/transactions/by-card/${id}`)).data,
  activeInstallments: async (): Promise<Transaction[]> =>
    (await api.get<Transaction[]>('/transactions/installments/active')).data,
};
