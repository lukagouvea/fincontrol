import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserMenu } from './UserMenu';
export const Header: React.FC = () => {
  const {
    currentUser
  } = useAuth();
  return <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Bem-vindo, {currentUser?.name || 'Usuário'}
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
        <UserMenu />
      </div>
    </header>;
};