/**
 * EXEMPLO DE INTEGRAÇÃO DO TUTORIAL NO APP.TSX
 * 
 * Este arquivo mostra como integrar o hook useTutorial no componente
 * principal da aplicação para ativar o auto-início do tutorial.
 */

import { useEffect } from 'react';
import { useTutorial } from './hooks/useTutorial';
import { useAuth } from './context/AuthContext'; // Seu contexto de autenticação

export const App = () => {
  const { user } = useAuth(); // Pega o usuário logado
  
  // ==========================================
  // INTEGRAÇÃO DO TUTORIAL
  // ==========================================
  // O hook já gerencia o auto-início automaticamente
  // Basta chamá-lo em um componente que renderiza após o login
  useTutorial();

  return (
    <div className="app-container">
      {/* Seu conteúdo da aplicação */}
      {user ? (
        <MainLayout />
      ) : (
        <AuthLayout />
      )}
    </div>
  );
};

/**
 * OU, se preferir ter mais controle, você pode usar assim:
 */
export const AppWithControl = () => {
  const { user } = useAuth();
  const { startTutorial, tutorialCompleted, isLoading } = useTutorial();

  // Exemplo: iniciar manualmente após alguma condição
  useEffect(() => {
    if (user && !isLoading && !tutorialCompleted) {
      // Você pode adicionar lógica adicional aqui
      console.log('Tutorial será iniciado automaticamente pelo hook');
    }
  }, [user, isLoading, tutorialCompleted]);

  return (
    <div className="app-container">
      {/* Seu conteúdo */}
    </div>
  );
};

/**
 * IMPORTANTE: Certifique-se de que os elementos referenciados
 * no tutorial têm os IDs corretos:
 * 
 * - #dashboard-overview
 * - #btn-add-transaction
 * - #menu-categories
 * - #menu-recurring
 * - #menu-calendar
 * - #theme-toggle
 * 
 * Exemplo de como adicionar IDs nos seus componentes:
 */
const ExemploComponentes = () => {
  return (
    <>
      {/* Dashboard */}
      <div id="dashboard-overview">
        <h1>Dashboard</h1>
        {/* ... */}
      </div>

      {/* Botão de adicionar transação */}
      <button id="btn-add-transaction">
        Adicionar Transação
      </button>

      {/* Menu de categorias */}
      <nav>
        <a href="/categories" id="menu-categories">
          Categorias
        </a>
        <a href="/recurring" id="menu-recurring">
          Recorrentes
        </a>
        <a href="/calendar" id="menu-calendar">
          Calendário
        </a>
      </nav>

      {/* Toggle de tema */}
      <button id="theme-toggle">
        🌓
      </button>
    </>
  );
};
