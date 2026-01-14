import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY_BASE = 'investmentMonthlyAmount';
const INVESTMENT_EVENT = 'fincontrol:investmentMonthlyAmountChanged';

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

export const useInvestmentSettings = () => {
  const { currentUser } = useAuth();

  const storageKey = useMemo(() => {
    const suffix = currentUser?.id ? `:${currentUser.id}` : '';
    return `${STORAGE_KEY_BASE}${suffix}`;
  }, [currentUser?.id]);

  const [investmentMonthlyAmount, setInvestmentMonthlyAmount] = useState<number>(() => {
    const raw = localStorage.getItem(storageKey);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  // Mantém reatividade quando:
  // - outra instância do hook atualiza (mesma página)
  // - o usuário muda (storageKey muda)
  useEffect(() => {
    const syncFromStorage = () => {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? Number(raw) : 0;
      setInvestmentMonthlyAmount(Number.isFinite(n) ? n : 0);
    };

    // 1) Sincroniza imediatamente quando storageKey muda
    syncFromStorage();

    // 2) Event listener (mesma aba)
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail?.key === storageKey) {
        syncFromStorage();
      }
    };

    // 3) Storage event (entre abas/janelas)
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) {
        syncFromStorage();
      }
    };

    window.addEventListener(INVESTMENT_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(INVESTMENT_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [storageKey]);

  const updateInvestmentMonthlyAmount = useCallback(
    (value: number | string) => {
      const next = typeof value === 'string' ? parseCurrencyLike(value) : value;
      const safe = Number.isFinite(next) ? Math.max(0, next) : 0;
      setInvestmentMonthlyAmount(safe);
      localStorage.setItem(storageKey, String(safe));

      // Dispara evento pra outras partes da UI reagirem sem refresh.
      window.dispatchEvent(new CustomEvent(INVESTMENT_EVENT, { detail: { key: storageKey } }));
    },
    [storageKey],
  );

  return {
    investmentMonthlyAmount,
    setInvestmentMonthlyAmount: updateInvestmentMonthlyAmount,
  };
};
