import { LoginCredentials, SignupCredentials, User, AuthResponse } from '../types/AuthTypes';
import { v4 as uuidv4 } from 'uuid';

// Simulação de banco de dados de usuários
let usersDb: User[] = [
  { id: '1', name: 'Usuário Teste', email: 'teste@email.com' }
];

const SIMULATED_DELAY = 800;

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulação simples: aceita qualquer senha por enquanto
        const user = usersDb.find(u => u.email === credentials.email);
        
        if (user) {
          resolve({
            user,
            token: 'fake-jwt-token-123456'
          });
        } else {
          // Se não achar, cria um usuário temporário para facilitar testes
          // (Em produção, isso seria um erro 401)
          const newUser: User = {
              id: '1',
              name: 'Usuário Teste',
              email: credentials.email
          };
          resolve({ user: newUser, token: 'fake-jwt-token-default' });
        }
      }, SIMULATED_DELAY);
    });
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const existingUser = usersDb.find(u => u.email === credentials.email);
        if (existingUser) {
          reject(new Error('E-mail já cadastrado'));
          return;
        }

        const newUser: User = {
          id: uuidv4(),
          name: credentials.name,
          email: credentials.email,
        };
        
        usersDb.push(newUser);

        resolve({
          user: newUser,
          token: `fake-jwt-token-${newUser.id}`
        });
      }, SIMULATED_DELAY);
    });
  },

  logout: async (): Promise<void> => {
    // Em uma API real, pode haver uma chamada para invalidar o token
    return new Promise(resolve => setTimeout(resolve, 200));
  }
};