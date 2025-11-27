import React, { createContext, useContext, useMemo } from 'react';



// Contexto
type FinanceContextType = {
  
};
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  }
  return context;
};


export const FinanceProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
 
  const value = useMemo(() => ({
  }), [
  ]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};