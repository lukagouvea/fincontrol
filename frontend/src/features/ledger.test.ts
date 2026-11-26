import { describe, expect, it } from "vitest";
import { buildMonthLedger, summarizeLedger } from "./ledger";
import type { FixedTransaction, Transaction } from "../types/FinanceTypes";

const iso = (key: string) => new Date(`${key}T00:00:00`).toISOString();

const transactions = [
  { id: "t1", type: "expense", description: "Padaria", amount: 38, categoryId: "food", date: iso("2026-11-16") },
  { id: "t2", type: "expense", description: "Notebook", amount: 420, categoryId: "tech", date: iso("2026-11-10"), installmentGroupId: "g1", installmentInfo: { current: 4, total: 10 } },
  { id: "t3", type: "income", description: "Cashback", amount: 12.5, categoryId: "extra", date: iso("2026-11-20") },
  { id: "t4", type: "expense", description: "Outubro", amount: 99, categoryId: "food", date: iso("2026-10-31") },
  // Variação do aluguel em novembro: não vira lançamento avulso.
  { id: "v1", type: "expense", description: "Aluguel", amount: 1500, categoryId: "home", date: iso("2026-11-05"), recurringRuleId: "rent" },
] as unknown as Transaction[];

const fixedExpenses: FixedTransaction[] = [
  { id: "rent", type: "expense", description: "Aluguel", amount: 1450, categoryId: "home", day: 5, startDate: iso("2026-01-01") },
  { id: "music", type: "expense", description: "Streaming", amount: 21.9, categoryId: "subs", day: 25, startDate: iso("2026-01-01") },
  { id: "old", type: "expense", description: "Academia", amount: 90, categoryId: "health", day: 3, startDate: iso("2025-01-01"), endDate: iso("2026-06-30") },
];
const fixedIncomes: FixedTransaction[] = [
  { id: "salary", type: "income", description: "Salário", amount: 7200, categoryId: "salary", day: 5, startDate: iso("2026-01-01") },
];
const variations = [{ id: "v1", fixedItemId: "rent", type: "expense" as const, year: 2026, month: 10, amount: 1500 }];

const ledger = () =>
  buildMonthLedger({ year: 2026, month: 10, transactions, fixedIncomes, fixedExpenses, variations, today: "2026-11-18" });

describe("buildMonthLedger", () => {
  it("junta avulsas, parcelas e recorrentes do mês, mais recentes primeiro", () => {
    const entries = ledger();
    expect(entries.map((e) => e.key)).toEqual([
      "rec:music:2026-11",
      "tx:t3",
      "tx:t1",
      "tx:t2",
      "rec:rent:2026-11",
      "rec:salary:2026-11",
    ]);
  });

  it("usa a variação do mês no valor da recorrente e marca o previsto", () => {
    const entries = ledger();
    const rent = entries.find((e) => e.key === "rec:rent:2026-11")!;
    expect(rent.amount).toBe(1500);
    expect(rent.recurring).toMatchObject({ hasVariation: true, variationId: "v1" });
    expect(entries.find((e) => e.key === "rec:music:2026-11")!.upcoming).toBe(true);
    expect(entries.find((e) => e.key === "tx:t2")!.installment).toEqual({ current: 4, total: 10, groupId: "g1" });
  });
});

describe("summarizeLedger", () => {
  it("soma o mês inteiro em centavos", () => {
    const summary = summarizeLedger(ledger());
    expect(summary.expense).toBe(38 + 420 + 1500 + 21.9);
    expect(summary.income).toBe(7212.5);
    expect(summary.fixedExpense).toBe(1521.9);
    expect(summary.variableExpense).toBe(458);
    expect(summary.balance).toBe(7212.5 - 1979.9);
    expect(summary.expenseByCategory[0]).toEqual({ categoryId: "home", total: 1500, count: 1 });
  });

  it("até hoje ignora o que ainda vai acontecer", () => {
    const summary = summarizeLedger(ledger(), { untilToday: true });
    expect(summary.expense).toBe(1958);
    expect(summary.income).toBe(7200);
  });
});
