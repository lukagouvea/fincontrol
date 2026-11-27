import { describe, expect, it } from "vitest";
import { deadlineLabel, goalProgress, monthlyPlan } from "./goals";

describe("metas", () => {
  it("divide o que falta em aportes do mês que vem até o prazo", () => {
    expect(monthlyPlan(10000, 0, "2027-06", "2026-11-18")).toEqual({ months: 7, perMonth: 1428.58, from: "2026-12", to: "2027-06", late: false });
    expect(monthlyPlan(3500, 2100, "2027-01", "2026-11-18")).toMatchObject({ months: 2, perMonth: 700 });
  });
  it("sem prazo ou já alcançada não sugere aporte; prazo passado avisa", () => {
    expect(monthlyPlan(1000, 0, null, "2026-11-18")).toBeNull();
    expect(monthlyPlan(1000, 1000, "2027-01", "2026-11-18")).toBeNull();
    expect(monthlyPlan(1000, 400, "2026-11", "2026-11-18")).toMatchObject({ months: 0, perMonth: 600, late: true });
  });
  it("progresso e rótulo do prazo", () => {
    expect(goalProgress(8400, 15000)).toBeCloseTo(0.56);
    expect(goalProgress(20000, 15000)).toBe(1);
    expect(deadlineLabel("2027-12")).toBe("dez de 2027");
  });
});
