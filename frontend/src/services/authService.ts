import { api } from './api';
import { LoginCredentials, SignupCredentials, User, AuthResponse } from '../types/AuthTypes';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    // POST /auth/login
    const { data } = await api.post<{ user: User }>('/auth/login', credentials);
    
    // O cookie é setado automaticamente pelo navegador, não precisamos salvar nada manual
    return { 
      user: data.user, 
      token: 'cookie-managed' // O frontend não mexe mais com token cru
    };
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    // POST /auth/signup
    const { data } = await api.post<{ user: User }>('/auth/signup', credentials);
    
    return { 
      user: data.user, 
      token: 'cookie-managed' 
    };
  },

  logout: async (): Promise<void> => {
    // POST /auth/logout
    await api.post('/auth/logout');
  },

  // Nova função crucial para verificar login ao recarregar a página
  me: async (): Promise<User | null> => {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    } catch (error) {
      return null;
    }
  }
};