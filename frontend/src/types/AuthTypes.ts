export type User = {
  id: string;
  name: string;
  email: string;
  token?: string; // Futuro JWT
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupCredentials = {
  name: string;
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};