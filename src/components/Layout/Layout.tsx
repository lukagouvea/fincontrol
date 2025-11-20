import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';

export const Layout: React.FC = () => {
  const {
    isAuthenticated,
    loading // 1. Obter o estado de loading
  } = useAuth();

  // 2. Se ainda estiver verificando, não renderize nada (ou um spinner)
  if (loading) {
    return <div>Carregando...</div>; // ou null, ou um componente de Spinner
  }

  // 3. Só redirecione se a verificação terminou e o usuário NÃO está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 4. Se a verificação terminou e está autenticado, mostre o layout
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
