import React, { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, LogOutIcon, PiggyBankIcon, UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useInvestmentSettings } from '../../hooks/useInvestmentSettings';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const UserMenu: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { investmentMonthlyAmount, setInvestmentMonthlyAmount } = useInvestmentSettings();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState<string>(() => String(investmentMonthlyAmount));

  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue(String(investmentMonthlyAmount));
  }, [investmentMonthlyAmount]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!open) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const applyInvestment = () => {
    setInvestmentMonthlyAmount(inputValue);
  };

  const handleInvestmentKeyDown = (e: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyInvestment();
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-2"
      >
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5" />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentUser?.name || 'Usuário'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentUser?.email || 'usuario@exemplo.com'}
          </p>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Configurações</p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                <PiggyBankIcon className="w-4 h-4 text-gray-600 dark:text-gray-200" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Investimento mensal</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Define quanto você quer separar todo mês.</p>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={applyInvestment}
                    onKeyDown={handleInvestmentKeyDown}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={applyInvestment}
                    className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Atual: {formatBRL(investmentMonthlyAmount)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Tema</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Atual: {theme === 'dark' ? 'Escuro' : 'Claro'}</p>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Alternar
              </button>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <LogOutIcon className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
