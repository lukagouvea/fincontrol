import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedTransactionService } from '../services/fixedTransactionService';

const CACHE_KEY_VARIATIONS = ['monthly-variations'];
const CACHE_KEY_TRANSACTIONS = ['transactions']; // Variações afetam o saldo/extrato também!

export const useMonthlyVariations = () => {
  return useQuery({
    queryKey: CACHE_KEY_VARIATIONS,
    queryFn: fixedTransactionService.getVariations,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddMonthlyVariation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Tipamos explicitamente o argumento esperado
    mutationFn: (data: { fixedItemId: string; amount: number; year: number; month: number; type: string }) => 
      fixedTransactionService.createVariation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_VARIATIONS });
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS }); // Atualiza o extrato também
    },
  });
};

export const useUpdateMonthlyVariation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; fixedItemId?: string; amount: number; year?: number; month?: number; type?: string } & any) => 
      fixedTransactionService.updateVariation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_VARIATIONS });
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
    },
  });
};

export const useDeleteMonthlyVariation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Agora aceita string explicitamente
    mutationFn: (id: string) => fixedTransactionService.deleteVariation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_VARIATIONS });
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
    },
  });
};