import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MonthState = { month: number; year: number; setMonth: (month: number, year: number) => void; isCurrent: boolean };

const MonthContext = createContext<MonthState | null>(null);

/** Mês selecionado, compartilhado entre Início, Transações e Relatórios. */
export function MonthProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [state, setState] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const value = useMemo(
    () => ({
      ...state,
      setMonth: (month: number, year: number) => setState({ month, year }),
      isCurrent: state.month === now.getMonth() && state.year === now.getFullYear(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );
  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useSelectedMonth() {
  const context = useContext(MonthContext);
  if (!context) throw new Error("useSelectedMonth precisa de MonthProvider");
  return context;
}
