import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { investmentService } from "../services/investmentService";

const parseCurrencyLike = (value: string): number => {
  // aceita "1234,56" ou "1234.56" ou "R$ 1.234,56"
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const CACHE_KEY_INVESTMENT = ["investment-settings"];
const CACHE_KEY_INVESTMENT_EFFECTIVE = ["investment-effective"];

export const useInvestmentSettings = () => {
  const { currentUser, sessionVersion, isCurrentSession } = useAuth();
  const queryClient = useQueryClient();
  const settingsKey = [
    ...CACHE_KEY_INVESTMENT,
    currentUser?.id,
    sessionVersion,
  ];
  const effectiveKey = [
    ...CACHE_KEY_INVESTMENT_EFFECTIVE,
    currentUser?.id,
    sessionVersion,
  ];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKey,
    queryFn: investmentService.getDefault,
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationKey: settingsKey,
    onMutate: () => ({ sessionVersion, settingsKey, effectiveKey }),
    mutationFn: (value: number | string) => {
      const next = typeof value === "string" ? parseCurrencyLike(value) : value;
      const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
      return investmentService.updateDefault(safe);
    },
    onSuccess: (updated, _value, started) => {
      if (!isCurrentSession(started.sessionVersion)) return;
      queryClient.setQueryData(started.settingsKey, updated);
      queryClient.invalidateQueries({
        queryKey: started.effectiveKey,
      });
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
    isError,
    refetch,
    saveInvestment: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
};

export const useMonthlyInvestment = (month: number, year: number) => {
  const { currentUser, sessionVersion, isCurrentSession } = useAuth();
  const queryClient = useQueryClient();
  const effectiveKey = [
    ...CACHE_KEY_INVESTMENT_EFFECTIVE,
    currentUser?.id,
    sessionVersion,
    month,
    year,
  ];

  const query = useQuery({
    queryKey: effectiveKey,
    queryFn: () => investmentService.getEffective(month, year),
    enabled:
      !!currentUser?.id && Number.isFinite(month) && Number.isFinite(year),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const setOverrideMutation = useMutation({
    mutationKey: [...effectiveKey, "set"],
    onMutate: () => ({ sessionVersion, effectiveKey }),
    mutationFn: (value: number | string) => {
      const next = typeof value === "string" ? parseCurrencyLike(value) : value;
      const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
      return investmentService.setOverride(month, year, safe);
    },
    onSuccess: (_data, _value, started) => {
      if (!isCurrentSession(started.sessionVersion)) return;
      queryClient.invalidateQueries({
        queryKey: started.effectiveKey,
      });
    },
  });

  const clearOverrideMutation = useMutation({
    mutationKey: [...effectiveKey, "clear"],
    onMutate: () => ({ sessionVersion, effectiveKey }),
    mutationFn: () => investmentService.clearOverride(month, year),
    onSuccess: (_data, _value, started) => {
      if (!isCurrentSession(started.sessionVersion)) return;
      queryClient.invalidateQueries({
        queryKey: started.effectiveKey,
      });
    },
  });

  return {
    ...query,
    setMonthlyInvestmentOverride: setOverrideMutation.mutate,
    clearMonthlyInvestmentOverride: clearOverrideMutation.mutate,
    saveMonthlyInvestment: setOverrideMutation.mutateAsync,
    removeMonthlyInvestment: clearOverrideMutation.mutateAsync,
    isSavingOverride: setOverrideMutation.isPending,
    isClearingOverride: clearOverrideMutation.isPending,
  };
};
