import { fromCents, toCents } from "../lib/money";

export type MonthResult = {
  /** "sobrou"/"passou" (mês fechado) ou "restam" (em andamento). */
  kind: "sobrou" | "passou" | "restam";
  amount: number;
  /** Com orçamento: orçamento − gasto. Sem: entradas − gastos. */
  basis: "orcamento" | "entradas";
};

/** Resultado do mês como no Histórico do design: Sobrou R$ 210 = 4.150 − 3.940. */
export function monthResult(spent: number, income: number, budget: number | null, current: boolean): MonthResult {
  const basis = budget && budget > 0 ? "orcamento" : "entradas";
  const reference = basis === "orcamento" ? budget! : income;
  const diff = fromCents(toCents(reference) - toCents(spent));
  if (current && diff >= 0) return { kind: "restam", amount: diff, basis };
  return { kind: diff >= 0 ? "sobrou" : "passou", amount: Math.abs(diff), basis };
}

export const resultLabel = (result: MonthResult, format: (v: number) => string) =>
  `${result.kind === "sobrou" ? "Sobrou" : result.kind === "passou" ? "Passou" : "Restam"} ${format(result.amount)}`;

export type HistoryRow = { key: string; month: number; year: number; spent: number; income: number; budget: number | null; current: boolean };

/** Média, meses dentro do orçamento, melhor e pior, só com meses fechados. */
export function historyStats(rows: HistoryRow[]) {
  const closed = rows.filter((row) => !row.current && (row.spent > 0 || row.income > 0));
  const average = closed.length ? fromCents(Math.round(closed.reduce((sum, row) => sum + toCents(row.spent), 0) / closed.length)) : 0;
  const withBudget = closed.filter((row) => row.budget);
  const within = withBudget.filter((row) => row.spent <= row.budget!).length;
  const results = closed.map((row) => ({ row, result: monthResult(row.spent, row.income, row.budget, false) }));
  const signed = (r: MonthResult) => (r.kind === "passou" ? -r.amount : r.amount);
  const best = [...results].sort((a, b) => signed(b.result) - signed(a.result))[0];
  const worst = [...results].sort((a, b) => signed(a.result) - signed(b.result))[0];
  return { closed: closed.length, average, withBudget: withBudget.length, within, best, worst };
}
