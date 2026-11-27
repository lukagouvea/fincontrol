/**
 * Estimativa do burndown por Monte Carlo (ver design/GAP.md).
 *
 * Cada simulação sorteia o gasto variável de cada dia que falta a partir de
 * dias já vividos: os dias completos do período atual ("recentes") e os dos
 * meses fechados anteriores ("histórico"). O peso dos recentes cresce com o
 * número de dias completos: w = d / (d + 7). Quando há pelo menos 3 amostras do
 * mesmo dia da semana, o sorteio fica nesse dia da semana (fim de semana ≠ dia
 * útil). Lançamentos variáveis já marcados para os próximos dias (parcelas,
 * compras futuras) entram como certos e por isso ficam fora das amostras.
 */
import { parseDateKey, shiftDateKey } from "../lib/dates";
import { toCents } from "../lib/money";
import type { LedgerEntry } from "./ledger";

export type DaySample = { weekday: number; cents: number };

export const isVariableExpense = (entry: LedgerEntry) => entry.type === "expense" && entry.source !== "recurring";

/** Gasto variável "sorteável" do dia: sem parcelas, que entram como lançamento conhecido. */
const isSampleable = (entry: LedgerEntry) => isVariableExpense(entry) && !entry.installment;

/** Uma amostra por dia de `from` a `to` (inclusive), com zero nos dias sem gasto. */
export function dailySamples(entries: LedgerEntry[], from: string, to: string): DaySample[] {
  const byDay = new Map<string, number>();
  for (const entry of entries) {
    if (!isSampleable(entry) || entry.date < from || entry.date > to) continue;
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + toCents(entry.amount));
  }
  const samples: DaySample[] = [];
  for (let key = from; key <= to; key = shiftDateKey(key, 1)) {
    samples.push({ weekday: parseDateKey(key).getDay(), cents: byDay.get(key) ?? 0 });
  }
  return samples;
}

/**
 * Amostras de um mês fechado. Mês sem nenhum gasto variável é ignorado
 * (provavelmente o controle ainda não tinha começado), senão puxaria a
 * estimativa para zero.
 */
export function monthSamples(entries: LedgerEntry[], year: number, month: number): DaySample[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month + 1)}-01`;
  const to = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;
  const samples = dailySamples(entries, from, to);
  return samples.some((s) => s.cents > 0) ? samples : [];
}

/** PRNG determinístico (mulberry32): mesma entrada, mesma estimativa. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashSeed = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

export type Band = { p10: number; p50: number; p90: number };

export type SimulationInput = {
  /** Restante (centavos) depois do gasto real até agora, inclusive o de hoje. */
  remainingCents: number;
  /** Gasto já lançado hoje; o dia de hoje ainda pode crescer até o sorteado. */
  todayCents: number;
  /** Dias que faltam depois de hoje, com os lançamentos já conhecidos de cada um. */
  days: Array<{ weekday: number; knownCents: number }>;
  todayWeekday: number;
  recent: DaySample[];
  history: DaySample[];
  runs?: number;
  seed: number;
};

export type SimulationResult = {
  /** Faixa do restante (centavos) ao fim de cada dia de `days`. */
  days: Band[];
  /** Fração das simulações que termina com restante ≥ 0. */
  pWithin: number;
};

/** Mínimo de amostras de um dia da semana para sortear só entre elas. */
const MIN_WEEKDAY = 3;
/** Dias completos em que recentes e histórico pesam igual. */
const PRIOR_DAYS = 7;

const percentile = (sorted: Float64Array, q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
};

function sampler(pool: DaySample[]) {
  const byWeekday = Array.from({ length: 7 }, (_, day) => pool.filter((s) => s.weekday === day));
  return (weekday: number, random: () => number) => {
    const source = byWeekday[weekday].length >= MIN_WEEKDAY ? byWeekday[weekday] : pool;
    return source[Math.floor(random() * source.length)].cents;
  };
}

/** Simula o restante do período; null quando não há nenhuma amostra. */
export function simulate(input: SimulationInput): SimulationResult | null {
  const { recent, history, days, runs = 2000 } = input;
  if (recent.length === 0 && history.length === 0) return null;
  const weight = history.length === 0 ? 1 : recent.length / (recent.length + PRIOR_DAYS);
  const fromRecent = recent.length ? sampler(recent) : null;
  const fromHistory = history.length ? sampler(history) : null;
  const random = rng(input.seed);
  const draw = (weekday: number) => (fromRecent && (!fromHistory || random() < weight) ? fromRecent : fromHistory!)(weekday, random);

  const columns = days.map(() => new Float64Array(runs));
  let within = 0;
  for (let run = 0; run < runs; run += 1) {
    let remaining = input.remainingCents - Math.max(0, draw(input.todayWeekday) - input.todayCents);
    for (let i = 0; i < days.length; i += 1) {
      remaining -= days[i].knownCents + draw(days[i].weekday);
      columns[i][run] = remaining;
    }
    if (remaining >= 0) within += 1;
  }
  return {
    days: columns.map((column) => {
      column.sort();
      return { p10: percentile(column, 0.1), p50: percentile(column, 0.5), p90: percentile(column, 0.9) };
    }),
    pWithin: within / runs,
  };
}
