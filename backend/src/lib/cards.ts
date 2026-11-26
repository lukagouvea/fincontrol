import { prisma } from './prisma.js';

/**
 * Confere se o cartão existe e é do usuário. `null`/`undefined` (À vista ou
 * campo ausente) são sempre válidos.
 */
export async function isOwnCard(userId: string, cardId: string | null | undefined) {
  if (!cardId) return true;
  const card = await prisma.card.findFirst({ where: { id: cardId, userId }, select: { id: true } });
  return !!card;
}

/** Soma meses sem transbordar: 31/jan + 1 mês = 28 (ou 29)/fev, não 3/mar. */
export function addMonthsClamped(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
