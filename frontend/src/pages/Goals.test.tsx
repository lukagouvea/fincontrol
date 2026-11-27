import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const reserva = {
  id: "g1",
  name: "Reserva de emergência",
  target: 15000,
  deadline: "2027-12",
  saved: 8400,
  createdAt: "2026-01-01T00:00:00.000Z",
  contributions: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 18, 12));
  window.history.replaceState({}, "", "/metas");
});
afterEach(() => vi.useRealTimers());

describe("Metas", () => {
  it("cria uma meta com prazo e já guardado, mostrando quanto guardar por mês", async () => {
    installApiFixture({ "post /goals": { ...reserva, id: "new" } });
    render(<App />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Criar meta" }));
    const form = await screen.findByRole("dialog", { name: "Nova meta" });
    await user.type(within(form).getByLabelText("Nome da meta"), "Reforma da casa");
    await user.type(within(form).getByLabelText("Quanto você quer juntar"), "10000");
    await user.type(within(form).getByLabelText("Prazo"), "2027-06");
    expect(within(form).getByText("R$ 1.428,58 por mês")).toBeVisible();
    expect(within(form).getByText("Em 7 aportes, de dezembro a junho.")).toBeVisible();
    await user.type(within(form).getByLabelText("Já guardado"), "1000");
    await user.click(within(form).getByRole("button", { name: "Criar meta" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/goals")?.data).toEqual({
      name: "Reforma da casa",
      target: 10000,
      deadline: "2027-06",
      initial: 1000,
    });
  });

  it("guarda na meta e não deixa retirar mais do que tem", async () => {
    installApiFixture({ "/goals": [reserva], "post /goals/g1/contributions": { id: "c9", amount: 500, date: "2026-11-18T12:00:00.000Z" } });
    render(<App />);
    const user = userEvent.setup();
    const card = await screen.findByRole("listitem", { name: "Reserva de emergência" });
    expect(within(card).getByText("56%")).toBeVisible();
    expect(within(card).getByText("Faltam R$ 6.600,00 de R$ 15.000,00")).toBeVisible();

    await user.click(within(card).getByRole("button", { name: "Guardar em Reserva de emergência" }));
    let sheet = await screen.findByRole("dialog", { name: "Guardar na meta" });
    await user.click(within(sheet).getByRole("radio", { name: "Retirar" }));
    sheet = screen.getByRole("dialog", { name: "Retirar da meta" });
    await user.type(within(sheet).getByLabelText("Valor"), "9000");
    await user.click(within(sheet).getByRole("button", { name: "Confirmar retirada" }));
    expect(within(sheet).getByText("Dá para retirar até R$ 8.400,00.")).toBeVisible();

    await user.click(within(sheet).getByRole("radio", { name: "Guardar" }));
    sheet = screen.getByRole("dialog", { name: "Guardar na meta" });
    await user.clear(within(sheet).getByLabelText("Valor"));
    await user.type(within(sheet).getByLabelText("Valor"), "500");
    expect(within(sheet).getByText("59%")).toBeVisible();
    await user.click(within(sheet).getByRole("button", { name: "Confirmar aporte" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/goals/g1/contributions")?.data).toMatchObject({ amount: 500 });
    expect(await screen.findByText("R$ 500,00 guardados em Reserva de emergência")).toBeVisible();
  });
});
