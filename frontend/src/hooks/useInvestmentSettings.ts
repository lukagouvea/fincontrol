import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { investmentService } from '../services/investmentService';

const parseCurrencyLike = (value: string): number => {
  // aceita "1234,56" ou "1234.56" ou "R$ 1.234,56"
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const CACHE_KEY_INVESTMENT = ['investment-settings'];
const CACHE_KEY_INVESTMENT_EFFECTIVE = ['investment-effective'];

export const useInvestmentSettings = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: CACHE_KEY_INVESTMENT,
    queryFn: investmentService.getDefault,
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: (value: number | string) => {
      const next = typeof value === 'string' ? parseCurrencyLike(value) : value;
      const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
      return investmentService.updateDefault(safe);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(CACHE_KEY_INVESTMENT, updated);
      queryClient.invalidateQueries({ queryKey: CACHE_KEY_INVESTMENT_EFFECTIVE });
    },
  });

  const investmentMonthlyAmount = data?.defaultMonthlyAmount ?? 0;

  const setInvestmentMonthlyAmount = useCallback(
    (value: number | string) => {
      mutation.mutate(value);
    },
    [mutation],
  );

  return {
    investmentMonthlyAmount,
    setInvestmentMonthlyAmount,
    isLoading,
    isSaving: mutation.isPending,
  };
};

export const useMonthlyInvestment = (month: number, year: number) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...CACHE_KEY_INVESTMENT_EFFECTIVE, month, year],
    queryFn: () => investmentService.getEffective(month, year),
    enabled: !!currentUser?.id && Number.isFinite(month) && Number.isFinite(year),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const setOverrideMutation = useMutation({
    mutationFn: (value: number | string) => {
      const next = typeof value === 'string' ? parseCurrencyLike(value) : value;
      const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
      return investmentService.setOverride(month, year, safe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEY_INVESTMENT_EFFECTIVE, month, year] });
    },
  });

  const clearOverrideMutation = useMutation({
    mutationFn: () => investmentService.clearOverride(month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEY_INVESTMENT_EFFECTIVE, month, year] });
    },
  });

  return {
    ...query,
    setMonthlyInvestmentOverride: setOverrideMutation.mutate,
    clearMonthlyInvestmentOverride: clearOverrideMutation.mutate,
    isSavingOverride: setOverrideMutation.isPending,
    isClearingOverride: clearOverrideMutation.isPending,
  };
};
