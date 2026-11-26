import { describe, expect, it } from "vitest";
import { buildInvoices, closingDateOf, dueDateOf, invoiceKeyFor, usedLimit, type CardCharge } from "./invoice";

const aurora = { closingDay: 8, dueDay: 15 };
const vento = { closingDay: 20, dueDay: 27 };
const late = { closingDay: 28, dueDay: 5 };

const charge = (date: string, amount: number, extra: Partial<CardCharge> = {}): CardCharge => ({
  key: `${date}-${amount}`,
  date,
  amount,
  description: "Compra",
  categoryId: null,
  source: "transaction",
  ...extra,
});

describe("fatura", () => {
  it("compra até o fechamento entra na fatura do mês; depois, na seguinte", () => {
    expect(invoiceKeyFor("2026-11-08", 8)).toBe("2026-11");
    expect(invoiceKeyFor("2026-11-09", 8)).toBe("2026-12");
    expect(invoiceKeyFor("2026-12-15", 8)).toBe("2027-01");
  });

  it("fechamento no dia 31 vira o último dia em meses curtos", () => {
    expect(closingDateOf("2027-02", 31)).toBe("2027-02-28");
    expect(invoiceKeyFor("2027-02-28", 31)).toBe("2027-02");
    expect(invoiceKeyFor("2027-03-01", 31)).toBe("2027-03");
  });

  it("vencimento no mesmo mês ou no seguinte, conforme o fechamento", () => {
    expect(dueDateOf("2026-12", aurora)).toBe("2026-12-15");
    expect(dueDateOf("2026-11", vento)).toBe("2026-11-27");
    expect(dueDateOf("2026-12", late)).toBe("2027-01-05");
  });

  it("monta as faturas com status, pagamento parcial e limite usado", () => {
    const today = "2026-11-18";
    const invoices = buildInvoices(
      aurora,
      [
        charge("2026-10-05", 300), // fatura out (paga)
        charge("2026-10-20", 200), // fatura nov (fechada em 8/nov, vence 15/nov → vencida)
        charge("2026-11-14", 86.5), // fatura dez (aberta)
        charge("2026-11-15", 142.3),
        charge("2026-11-16", -20), // estorno
        charge("2026-12-10", 350, { installment: { current: 2, total: 3 } }), // fatura jan (futura)
      ],
      [
        { id: "p1", invoiceMonth: "2026-10", amount: 300, paidAt: "2026-10-15T12:00:00Z" },
        { id: "p2", invoiceMonth: "2026-11", amount: 50, paidAt: "2026-11-10T12:00:00Z" },
      ],
      today,
    );
    expect(invoices.map((i) => [i.key, i.status, i.total, i.remaining])).toEqual([
      ["2026-10", "paga", 300, 0],
      ["2026-11", "vencida", 200, 150],
      ["2026-12", "aberta", 208.8, 208.8],
      ["2027-01", "futura", 350, 350],
    ]);
    expect(invoices[2].items.map((i) => i.date)).toEqual(["2026-11-16", "2026-11-15", "2026-11-14"]);
    expect(usedLimit(invoices)).toBe(708.8);
  });

  it("mostra a fatura atual mesmo sem compras e marca paga quando quitada", () => {
    expect(buildInvoices(vento, [], [], "2026-11-18")).toMatchObject([{ key: "2026-11", status: "aberta", total: 0 }]);
    const paid = buildInvoices(vento, [charge("2026-11-01", 100)], [{ id: "p", invoiceMonth: "2026-11", amount: 100, paidAt: "2026-11-18T00:00:00Z" }], "2026-11-18");
    expect(paid[0].status).toBe("paga");
    expect(usedLimit(paid)).toBe(0);
  });

  it("faturas vencidas antes do cadastro do cartão contam como pagas", () => {
    const invoices = buildInvoices(
      aurora,
      [charge("2026-08-03", 420), charge("2026-09-03", 420), charge("2026-11-03", 420)],
      [],
      "2026-11-26",
      "2026-11-26",
    );
    expect(invoices.map((i) => [i.key, i.status, i.remaining])).toEqual([
      ["2026-08", "paga", 0],
      ["2026-09", "paga", 0],
      ["2026-11", "paga", 0],
      ["2026-12", "aberta", 0],
    ]);
    expect(usedLimit(invoices)).toBe(0);
  });
});
