import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserMenu } from './UserMenu';
export const Header: React.FC = () => {
  const {
    currentUser
  } = useAuth();
  return <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6 flex items-center justify-between transition-colors duration-200">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Bem-vindo, {currentUser?.name || 'Usuário'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <UserMenu />
      </div>
    </header>;
};