export type User = {
  id: string;
  name: string;
  email: string;
  /** ISO; null = ainda não fez a configuração inicial. */
  onboardingCompletedAt?: string | null;
  createdAt?: string;
  /** Último mês fechado ('YYYY-MM') cuja virada já foi vista. */
  lastClosingSeen?: string | null;
  /** Preferências da central de alertas (ausente = padrão). */
  alertPrefs?: Record<string, boolean> | null;
  /** ISO: alertas até aqui já foram vistos. */
  alertsReadAt?: string | null;
  /** ISO (dia 1 do mês): contas que venceram antes disso contam como pagas. */
  paymentsTrackedFrom?: string;
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