import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { cardService, type CardInput } from '../services/cardService';
import type { CardPayment } from '../types/FinanceTypes';

export const CARDS_KEY = ['cards'];
const STALE = 1000 * 60 * 5;

export const useCards = () => useQuery({ queryKey: CARDS_KEY, queryFn: cardService.list, staleTime: STALE });

/** Todas as transações de cada cartão (para faturas e limite usado). */
export const useCardsTransactions = (cardIds: string[]) =>
  useQueries({
    queries: cardIds.map((id) => ({
      queryKey: ['transactions', 'card', id],
      queryFn: () => cardService.transactions(id),
      staleTime: STALE,
    })),
  });

export const useActiveInstallments = () =>
  useQuery({ queryKey: ['transactions', 'installments-active'], queryFn: cardService.activeInstallments, staleTime: STALE });

function useInvalidateCards() {
  const client = useQueryClient();
  return () => Promise.all([client.invalidateQueries({ queryKey: CARDS_KEY }), client.invalidateQueries({ queryKey: ['transactions'] })]);
}

export const useCreateCard = () => {
  const invalidate = useInvalidateCards();
  return useMutation({ mutationFn: cardService.create, onSuccess: invalidate });
};

export const useUpdateCard = () => {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CardInput> & { archived?: boolean } }) => cardService.update(id, data),
    onSuccess: invalidate,
  });
};

export const useDeleteCard = () => {
  const invalidate = useInvalidateCards();
  return useMutation({ mutationFn: cardService.remove, onSuccess: invalidate });
};

export const useAddPayment = () => {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({ cardId, payment }: { cardId: string; payment: Omit<CardPayment, 'id'> }) => cardService.addPayment(cardId, payment),
    onSuccess: invalidate,
  });
};

export const useDeletePayment = () => {
  const invalidate = useInvalidateCards();
  return useMutation({
    mutationFn: ({ cardId, paymentId }: { cardId: string; paymentId: string }) => cardService.removePayment(cardId, paymentId),
    onSuccess: invalidate,
  });
};
