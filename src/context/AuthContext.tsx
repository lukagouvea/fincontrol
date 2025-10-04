import React, { useEffect, useState, createContext, useContext } from 'react';
type User = {
  id: string;
  name: string;
  email: string;
};
type AuthContextType = {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Simula a verificação de autenticação ao carregar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);
  const login = async (email: string, password: string) => {
    // Simulação de login - em produção, isso seria uma chamada de API
    try {
      // Simulando um delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock user para demonstração
      const user = {
        id: '1',
        name: 'Usuário Teste',
        email
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      throw new Error('Falha no login');
    }
  };
  const signup = async (name: string, email: string, password: string) => {
    // Simulação de cadastro - em produção, isso seria uma chamada de API
    try {
      // Simulando um delay de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock user para demonstração
      const user = {
        id: '1',
        name,
        email
      };
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      throw new Error('Falha no cadastro');
    }
  };
  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };
  const value = {
    currentUser,
    isAuthenticated,
    login,
    signup,
    logout
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};