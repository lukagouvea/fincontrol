import { describe, expect, it } from "vitest";
import { burndown } from "./budget";
import { dailySamples, monthSamples, simulate, type DaySample } from "./forecast";
import type { LedgerEntry } from "./ledger";
import { shiftDateKey } from "../lib/dates";

const entry = (date: string, amount: number, extra: Partial<LedgerEntry> = {}): LedgerEntry => ({
  key: `${date}-${amount}-${extra.installment ? "p" : ""}`,
  source: "transaction",
  id: `${date}-${amount}`,
  type: "expense",
  description: "x",
  amount,
  categoryId: "food",
  date,
  upcoming: false,
  cardId: null,
  ...extra,
});

/** R$ `amount` em cada dia de `from` a `to`. */
const everyDay = (from: string, to: string, amount: number) => {
  const entries: LedgerEntry[] = [];
  for (let key = from; key <= to; key = shiftDateKey(key, 1)) entries.push(entry(key, amount));
  return entries;
};

const installment = { current: 2, total: 3, groupId: null };
const flat = (n: number, cents: number): DaySample[] => Array.from({ length: n }, (_, i) => ({ weekday: i % 7, cents }));
const month = (entries: LedgerEntry[], today: string, history: DaySample[] = []) =>
  burndown(1000, entries, "2026-11-01", "2026-11-30", today, { history });

describe("estimativa do burndown", () => {
  it("com gasto constante, a faixa se fecha na extrapolação exata, contando hoje como dia inteiro", () => {
    // 9 dias de R$10 (R$90), hoje sem gasto: hoje + 20 dias × R$10 → sobram R$700.
    // A média antiga (R$90 ÷ 10 dias) daria R$730.
    const { points, forecast } = month(everyDay("2026-11-01", "2026-11-09", 10), "2026-11-10");
    expect(forecast).toEqual({ p10: 700, p50: 700, p90: 700, pWithin: 1 });
    expect(points[9].projection).toEqual({ p10: 910, p50: 910, p90: 910 });
    expect(points[10].projection!.p50).toBe(890);
  });

  it("o gasto parcial de hoje não muda a estimativa até passar do dia típico", () => {
    const past = everyDay("2026-11-01", "2026-11-09", 10);
    expect(month([...past, entry("2026-11-10", 4)], "2026-11-10").forecast!.p50).toBe(700);
    expect(month([...past, entry("2026-11-10", 15)], "2026-11-10").forecast!.p50).toBe(695);
  });

  it("parcela futura conhecida entra no dia dela e parcela passada não vira amostra", () => {
    const past = everyDay("2026-11-01", "2026-11-09", 10);
    const { points, forecast } = month(
      [...past, entry("2026-11-05", 100, { installment }), entry("2026-11-20", 50, { installment, upcoming: true })],
      "2026-11-10",
    );
    expect(points[18].projection!.p50).toBe(710); // 19/11: 810 − 100 da parcela de 05/11
    expect(points[19].projection!.p50).toBe(650); // 20/11: −10 do dia −50 da parcela
    expect(forecast!.p50).toBe(550);
  });

  it("no início do mês usa o histórico; o peso dele cai conforme o mês avança", () => {
    expect(month([], "2026-11-01", flat(90, 2000)).forecast).toMatchObject({ p10: 400, p50: 400, p90: 400 });
    const perDay = (recentDays: number) => {
      const result = simulate({
        remainingCents: 100_000,
        todayCents: 0,
        todayWeekday: 0,
        days: Array.from({ length: 30 }, (_, i) => ({ weekday: i % 7, knownCents: 0 })),
        recent: flat(recentDays, 1000),
        history: flat(90, 2000),
        seed: 1,
      })!;
      return (100_000 - result.days.at(-1)!.p50) / 31 / 100;
    };
    expect(perDay(7)).toBeCloseTo(15, 0); // w = 7/14
    expect(perDay(28)).toBeCloseTo(12, 0); // w = 28/35
  });

  it("sorteia pelo dia da semana quando há amostras suficientes", () => {
    // Sábados de R$100, outros dias zero: só os sábados futuros gastam.
    const recent = Array.from({ length: 21 }, (_, i) => ({ weekday: i % 7, cents: i % 7 === 6 ? 10_000 : 0 }));
    const result = simulate({
      remainingCents: 50_000,
      todayCents: 0,
      todayWeekday: 0,
      days: Array.from({ length: 13 }, (_, i) => ({ weekday: (i + 1) % 7, knownCents: 0 })),
      recent,
      history: [],
      seed: 1,
    })!;
    expect(result.days.map((d) => d.p10 === d.p90 && d.p50)).toEqual([50_000, 50_000, 50_000, 50_000, 50_000, 40_000, 40_000, 40_000, 40_000, 40_000, 40_000, 40_000, 30_000]);
  });

  it("faixa e chance refletem a incerteza e são estáveis entre chamadas", () => {
    const input = {
      remainingCents: 20_000,
      todayCents: 0,
      todayWeekday: 0,
      days: Array.from({ length: 19 }, (_, i) => ({ weekday: i % 7, knownCents: 0 })),
      recent: [0, 2000].flatMap((cents) => flat(1, cents)),
      history: [],
      seed: 7,
    };
    const result = simulate(input)!;
    const end = result.days.at(-1)!;
    expect(end.p10).toBeLessThan(end.p50);
    expect(end.p50).toBeLessThan(end.p90);
    expect(result.pWithin).toBeGreaterThan(0.3);
    expect(result.pWithin).toBeLessThan(0.8);
    expect(simulate(input)).toEqual(result);
    expect(simulate({ ...input, seed: 8 })).not.toEqual(result);
    expect(simulate({ ...input, remainingCents: 1_000_000 })!.pWithin).toBe(1);
    expect(simulate({ ...input, remainingCents: -100 })!.pWithin).toBe(0);
  });

  it("amostras: um valor por dia, zero nos dias sem gasto, sem parcelas e recorrentes", () => {
    const entries = [
      entry("2026-11-01", 10),
      entry("2026-11-01", 5),
      entry("2026-11-02", 99, { installment }),
      entry("2026-11-03", 99, { source: "recurring" }),
      entry("2026-11-03", 99, { type: "income" }),
    ];
    expect(dailySamples(entries, "2026-11-01", "2026-11-03")).toEqual([
      { weekday: 0, cents: 1500 },
      { weekday: 1, cents: 0 },
      { weekday: 2, cents: 0 },
    ]);
    expect(monthSamples(entries, 2026, 10)).toHaveLength(30);
    // Mês sem gasto variável (antes de começar o controle) não entra.
    expect(monthSamples([entry("2026-10-03", 99, { installment })], 2026, 9)).toEqual([]);
  });

  it("na semana, as amostras recentes vêm do mês inteiro", () => {
    const entries = [...everyDay("2026-11-01", "2026-11-15", 30), ...everyDay("2026-11-16", "2026-11-17", 0)];
    // Seg 16 a dom 22, hoje qua 18; dias completos do mês: R$30 em 15 de 17.
    const week = burndown(200, entries, "2026-11-16", "2026-11-22", "2026-11-18", { samplesFrom: "2026-11-01" });
    const onlyWeek = burndown(200, entries, "2026-11-16", "2026-11-22", "2026-11-18");
    expect(week.forecast!.p50).toBeLessThan(onlyWeek.forecast!.p50);
    expect(onlyWeek.forecast!.p50).toBe(200);
  });
});
