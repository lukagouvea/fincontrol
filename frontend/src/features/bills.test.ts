import { describe, expect, it } from "vitest";
import { billStatus, isBill, pendingBills } from "./bills";
import { buildMonthLedger } from "./ledger";
import { buildAlerts, DEFAULT_PREFS } from "./alerts";
import type { FixedTransaction, Transaction } from "../types/FinanceTypes";

const today = "2026-11-27";
const trackedFrom = "2026-11-01";

describe("status de conta a pagar", () => {
  it("paga se marcada; paga presumida antes do controle; vencida depois do dia; a pagar até o dia", () => {
    expect(billStatus("2026-11-05", "2026-11-05T12:00:00Z", trackedFrom, today)).toEqual({ status: "paga", paidAt: "2026-11-05T12:00:00Z", presumed: false });
    expect(billStatus("2026-10-05", null, trackedFrom, today)).toEqual({ status: "paga", paidAt: null, presumed: true });
    expect(billStatus("2026-11-26", null, trackedFrom, today).status).toBe("vencida");
    expect(billStatus("2026-11-27", null, trackedFrom, today).status).toBe("a-pagar");
    expect(billStatus("2026-12-05", null, trackedFrom, today).status).toBe("a-pagar");
  });

  it("só despesa À vista recorrente ou parcelada é conta a pagar", () => {
    expect(isBill({ type: "expense", cardId: null, source: "recurring" })).toBe(true);
    expect(isBill({ type: "expense", cardId: null, source: "transaction", installment: { current: 1, total: 3 } })).toBe(true);
    expect(isBill({ type: "expense", cardId: "c1", source: "recurring" })).toBe(false);
    expect(isBill({ type: "expense", cardId: null, source: "transaction" })).toBe(false);
    expect(isBill({ type: "income", cardId: null, source: "recurring" })).toBe(false);
  });

  it("pendentes: vencidas e as que vencem em até 7 dias, da mais antiga à mais nova", () => {
    const e = (date: string, status: "paga" | "a-pagar" | "vencida") => ({ date, bill: { status, paidAt: null, presumed: false } });
    const list = [e("2026-12-10", "a-pagar"), e("2026-11-28", "a-pagar"), e("2026-11-05", "vencida"), e("2026-11-20", "paga")];
    expect(pendingBills(list, today).map((x) => x.date)).toEqual(["2026-11-05", "2026-11-28"]);
  });
});

const rent: FixedTransaction = { id: "rent", description: "Aluguel", amount: 1500, categoryId: "home", type: "expense", day: 5, startDate: "2026-01-01T12:00:00Z", cardId: null };
const streaming: FixedTransaction = { ...rent, id: "tv", description: "Streaming", amount: 40, day: 10, cardId: "c1" };
const parcel = (id: string, date: string, extra: Partial<Transaction> = {}) =>
  ({ id, description: "Curso", amount: 300, categoryId: "edu", type: "expense", date: `${date}T15:00:00.000Z`, cardId: null, installmentGroupId: "g1", installmentInfo: { current: 2, total: 3 }, ...extra }) as unknown as Transaction;

describe("ledger com contas a pagar", () => {
  const ledger = (transactions: Transaction[], paidRent: boolean) =>
    buildMonthLedger({
      year: 2026,
      month: 10,
      transactions,
      fixedIncomes: [],
      fixedExpenses: [rent, streaming],
      variations: [],
      today,
      bills: { trackedFrom, recurringPayments: paidRent ? [{ ruleId: "rent", month: "2026-11", paidAt: "2026-11-05T12:00:00Z" }] : [] },
    });

  it("recorrente À vista por mês, parcela À vista pelo paidAt; cartão fica de fora", () => {
    const entries = ledger([parcel("p2", "2026-11-20"), parcel("c", "2026-11-21", { cardId: "c1" })], false);
    const by = (key: string) => entries.find((entry) => entry.key === key);
    expect(by("rec:rent:2026-11")?.bill?.status).toBe("vencida");
    expect(by("rec:tv:2026-11")?.bill).toBeUndefined();
    expect(by("tx:p2")?.bill?.status).toBe("vencida");
    expect(by("tx:c")?.bill).toBeUndefined();

    const paid = ledger([parcel("p2", "2026-11-20", { paidAt: "2026-11-20T18:00:00Z" })], true);
    expect(paid.find((entry) => entry.key === "rec:rent:2026-11")?.bill?.status).toBe("paga");
    expect(paid.find((entry) => entry.key === "tx:p2")?.bill?.paidAt).toBe("2026-11-20T18:00:00Z");
  });

  it("sem contexto de contas, nenhuma linha ganha status", () => {
    const entries = buildMonthLedger({ year: 2026, month: 10, transactions: [], fixedIncomes: [], fixedExpenses: [rent], variations: [], today });
    expect(entries[0].bill).toBeUndefined();
  });

  it("alerta de conta vencida e de conta que vence hoje", () => {
    const entries = ledger([parcel("p3", "2026-11-27")], false);
    const alerts = buildAlerts({ today, prefs: DEFAULT_PREFS, entries: [], weeks: [], categories: [], categoryName: () => "", cards: [], bills: pendingBills(entries, today) });
    // A central ordena do mais recente para o mais antigo.
    expect(alerts.map((a) => [a.title, a.tone])).toEqual([
      ["Curso vence hoje", "warning"],
      ["Aluguel está vencida", "danger"],
    ]);
    const off = buildAlerts({ today, prefs: { ...DEFAULT_PREFS, contas: false }, entries: [], weeks: [], categories: [], categoryName: () => "", cards: [], bills: pendingBills(entries, today) });
    expect(off).toHaveLength(0);
  });
});
