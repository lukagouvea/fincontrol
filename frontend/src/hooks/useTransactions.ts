import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
  keepPreviousData,
} from "@tanstack/react-query";
import { transactionService } from "../services/transactionService";
import { Transaction } from "../types/FinanceTypes";
import { useEffect } from "react";

const CACHE_KEY_TRANSACTIONS = ["transactions"];
const CACHE_KEY_COMPRAS_PARCELADAS = ["compras-parceladas"];

// --- LEITURA (GET) ---

export const useTransactions = (month?: number, year?: number) => {
  return useQuery({
    // A chave do cache muda se o mês mudar, forçando o refresh automático
    queryKey: [...CACHE_KEY_TRANSACTIONS, month, year],
    queryFn: () => transactionService.getAll(month, year),
    staleTime: 1000 * 60 * 5, // 5 minutos
    placeholderData: keepPreviousData,
  });
};

export const useThreeMonthsTransactions = (
  centerMonth: number,
  centerYear: number,
) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    // Warm the next three-month window before the user navigates to it.
    for (const offset of [-2, 2]) {
      const date = new Date(centerYear, centerMonth + offset, 1);
      void queryClient.prefetchQuery({
        queryKey: [
          ...CACHE_KEY_TRANSACTIONS,
          date.getMonth(),
          date.getFullYear(),
        ],
        queryFn: () =>
          transactionService.getAll(date.getMonth(), date.getFullYear()),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
      });
    }
  }, [centerMonth, centerYear, queryClient]);
  // Definimos os deslocamentos: -1 (mês anterior), 0 (atual), +1 (próximo)
  const offsets = [-1, 0, 1];

  // Preparamos as configurações das 3 queries
  const queriesOptions = offsets.map((offset) => {
    // A mágica do Date resolve viradas de ano (ex: Mês 11 + 1 vira Mês 0 do ano seguinte)
    const date = new Date(centerYear, centerMonth + offset, 1);
    const m = date.getMonth();
    const y = date.getFullYear();

    return {
      queryKey: [...CACHE_KEY_TRANSACTIONS, m, y],
      queryFn: () => transactionService.getAll(m, y),
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 15,
    };
  });

  // Executa todas em paralelo
  const results = useQueries({ queries: queriesOptions });

  // 1. Combina todos os arrays de retorno em um só (flat)
  const combinedTransactions = results.flatMap((result) => result.data || []);

  // 2. Verifica se algum deles ainda está carregando
  const isLoading = results.some((result) => result.isLoading);

  // 3. Verifica se houve erro em algum
  const isError = results.some((result) => result.isError);

  // Opcional: Ordenar por data (pois a junção pode vir fora de ordem)
  const sortedTransactions = combinedTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    data: sortedTransactions,
    isLoading,
    isError,
    getMonthState: (date: Date) => {
      const offset =
        (date.getFullYear() - centerYear) * 12 + date.getMonth() - centerMonth;
      const result = results[offset + 1];
      return {
        isLoading: !result || result.isPending,
        isError: result?.isError ?? false,
        refetch: () => result?.refetch(),
      };
    },
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
};

export const useTwelveMonthsTransactions = (
  endMonth: number,
  endYear: number,
  enabled = true,
) => {
  const offsets = Array.from({ length: 12 }, (_, i) => -i); // 0, -1, -2 ... -11

  const queriesOptions = offsets.map((offset) => {
    const date = new Date(endYear, endMonth + offset, 1);
    const m = date.getMonth();
    const y = date.getFullYear();

    return {
      enabled,
      queryKey: [...CACHE_KEY_TRANSACTIONS, m, y],
      queryFn: () => transactionService.getAll(m, y),
      staleTime: 1000 * 60 * 5, // 5 minutos
    };
  });

  const results = useQueries({ queries: queriesOptions });
  const combinedTransactions = results.flatMap((result) => result.data || []);
  const isLoading = results.some((result) => result.isLoading);
  const isError = results.some((result) => result.isError);

  const sortedTransactions = combinedTransactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    data: sortedTransactions,
    isLoading,
    isError,
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
};

export const usePrefetchAdjacentMonths = (
  currentMonth: number,
  currentYear: number,
) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetch = (offset: number) => {
      const d = new Date(currentYear, currentMonth + offset, 1);
      const m = d.getMonth();
      const y = d.getFullYear();

      queryClient.prefetchQuery({
        queryKey: ["transactions", m, y],
        queryFn: () => transactionService.getAll(m, y),
        staleTime: 1000 * 60 * 5,
      });
    };

    prefetch(-1);
    prefetch(1);
  }, [currentMonth, currentYear, queryClient]);
};

export const useComprasParceladas = () => {
  return useQuery({
    queryKey: CACHE_KEY_COMPRAS_PARCELADAS,
    queryFn: transactionService.getAllComprasParceladas,
    staleTime: 1000 * 60 * 5,
  });
};

// --- ESCRITA (MUTATIONS) ---

export const useAddTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) =>
      transactionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.delete,
    onSuccess: () => {
      // Ao deletar uma transação, pode ser que uma compra parcelada inteira tenha sumido
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_COMPRAS_PARCELADAS });
    },
  });
};

export const useAddCompraParcelada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transactionService.createCompraParcelada,
    onSuccess: () => {
      // Adicionar compra parcelada afeta tanto a lista de compras quanto a de transações (parcelas geradas)
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_TRANSACTIONS });
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_COMPRAS_PARCELADAS });
    },
  });
};
