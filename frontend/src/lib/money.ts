/**
 * Dinheiro na interface. O backend usa Decimal(12,2); aqui toda conta passa por
 * centavos inteiros para não acumular erro de ponto flutuante.
 */
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInteger = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Sinal de menos tipográfico usado no design ("− R$ 23,30"). */
export const MINUS = "−";

export const toCents = (value: number) => Math.round(value * 100);
export const fromCents = (cents: number) => cents / 100;

/** Soma sem erro de arredondamento. */
export const sumMoney = (values: number[]) =>
  fromCents(values.reduce((total, value) => total + toCents(value), 0));

/** "R$ 1.234,56". Usa espaço comum entre R$ e o número (Intl usa NBSP). */
export function formatMoney(value: number, { cents = true } = {}) {
  const formatter = cents ? brl : brlInteger;
  return formatter.format(Math.abs(value) < 0.005 ? 0 : value).replace(/ /g, " ");
}

export type MoneyKind = "expense" | "income" | "neutral";

/**
 * Valor com sinal explícito: despesas "− R$ 23,30", receitas "+ R$ 7.200,00".
 * Cor nunca é o único sinal (DESIGN.md).
 */
export function formatSignedMoney(value: number, kind: MoneyKind) {
  const amount = formatMoney(Math.abs(value));
  if (kind === "expense") return `${MINUS} ${amount}`;
  if (kind === "income") return `+ ${amount}`;
  return value < 0 ? `${MINUS} ${amount}` : amount;
}
