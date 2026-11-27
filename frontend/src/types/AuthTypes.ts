export type User = {
  id: string;
  name: string;
  email: string;
  tutorialCompleted?: boolean;
  /** ISO; null = ainda não fez a configuração inicial. */
  onboardingCompletedAt?: string | null;
  createdAt?: string;
  /** Último mês fechado ('YYYY-MM') cuja virada já foi vista. */
  lastClosingSeen?: string | null;
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