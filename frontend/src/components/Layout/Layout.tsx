import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { useTutorial } from '../../hooks/useTutorial';

export const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // Inicializa o tutorial (auto-início se necessário)
  useTutorial();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>;
};