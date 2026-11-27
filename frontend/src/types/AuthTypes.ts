export type User = {
  id: string;
  name: string;
  email: string;
  tutorialCompleted?: boolean;
  /** ISO; null = ainda não fez a configuração inicial. */
  onboardingCompletedAt?: string | null;
  createdAt?: string;
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