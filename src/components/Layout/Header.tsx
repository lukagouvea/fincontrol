import React from 'react';
import { BellIcon, UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from './ThemeToggle.tsx'
export const Header: React.FC = () => {
  const {
    user // Correção: usar 'user' em vez de 'currentUser'
  } = useAuth();
  return <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          {/* Correção: usar 'user' */}
          Bem-vindo, {user?.name || 'Usuário'}
        </h2>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 rounded-full hover:bg-gray-100">
          <ThemeToggle/>
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">
              {/* Correção: usar 'user' */}
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500">
              {/* Correção: usar 'user' */}
              {user?.email || 'usuario@exemplo.com'}
            </p>
          </div>
        </div>
      </div>
    </header>;
};