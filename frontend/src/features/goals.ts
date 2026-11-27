import { fromCents, toCents } from "../lib/money";
import { monthNames } from "../lib/dates";

/**
 * "Para chegar lá" (NovaMeta.html): aportes mensais iguais do mês que vem
 * até o mês do prazo, inclusive. Ex.: em 18/nov com prazo jun/2027 →
 * 7 aportes, de dezembro a junho.
 */
export function monthlyPlan(target: number, saved: number, deadline: string | null, today: string) {
  const missing = Math.max(0, toCents(target) - toCents(saved));
  if (!deadline || missing === 0) return null;
  const [ty, tm] = today.split("-").map(Number);
  const [dy, dm] = deadline.split("-").map(Number);
  const months = dy * 12 + dm - (ty * 12 + tm);
  if (months <= 0) return { months: 0, perMonth: fromCents(missing), from: null, to: deadline, late: true };
  const fromIndex = ty * 12 + tm; // mês seguinte, 0-based = tm
  const from = `${Math.floor(fromIndex / 12)}-${String((fromIndex % 12) + 1).padStart(2, "0")}`;
  return { months, perMonth: fromCents(Math.ceil(missing / months)), from, to: deadline, late: false };
}

export const goalProgress = (saved: number, target: number) => (target > 0 ? Math.min(1, Math.max(0, saved / target)) : 0);

/** "dez de 2027" */
export const deadlineLabel = (deadline: string) =>
  `${monthNames[Number(deadline.slice(5, 7)) - 1].slice(0, 3).toLowerCase()} de ${deadline.slice(0, 4)}`;
