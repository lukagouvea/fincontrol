import React, { useEffect, useState, createContext, useContext, useMemo } from 'react';
import { User, LoginCredentials, SignupCredentials } from '../types/AuthTypes';
import { authService } from '../services/authService';

type AuthContextType = {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Adicionado estado de loading global
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Começa true para verificar localStorage

  // Verifica autenticação ao carregar (Persistência no Refresh)
  useEffect(() => {
    const initAuth = () => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        setCurrentUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user, token } = await authService.login(credentials);
      
      // Atualiza estado
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // Persistência local
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch (error) {
      throw error; // Repassa o erro para o componente tratar (ex: mostrar mensagem)
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    try {
      const { user, token } = await authService.signup(credentials);
      
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout(); // Chama o serviço (fire and forget)
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      login,
      signup,
      logout
    }),
    [currentUser, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};