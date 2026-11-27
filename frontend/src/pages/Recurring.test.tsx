import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { installApiFixture, requests } from "../test/fixtures";

const rentWithVersions = {
  id: "rent",
  type: "expense",
  description: "Aluguel",
  amount: 1500,
  day: 10,
  startDate: "2026-01-01T12:00:00Z",
  categoryId: "food",
  versions: [
    { effectiveFrom: "2026-01-01", amount: 1400, categoryId: "food", day: 10 },
    { effectiveFrom: "2026-06-01", amount: 1500, categoryId: "food", day: 10 },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
});
afterEach(() => vi.useRealTimers());

function renderRecurring(overrides: Record<string, unknown>) {
  installApiFixture(overrides);
  window.history.replaceState({}, "", "/recorrentes");
  render(<App />);
  return userEvent.setup();
}

describe("Recorrentes", () => {
  it("permite variação zero em outro mês e mantém edição de uma encerrada", async () => {
    const user = renderRecurring({
      "/recurring?type=expense": [
        { id: "rent", type: "expense", description: "Aluguel", amount: 1000, day: 10, startDate: "2026-01-01T12:00:00Z", categoryId: "food" },
        {
          id: "ended",
          type: "expense",
          description: "Assinatura antiga",
          amount: 40,
          day: 10,
          startDate: "2026-01-01T12:00:00Z",
          endDate: "2026-10-01T12:00:00Z",
          categoryId: "food",
        },
      ],
      "/recurring/variations": [{ id: "variation", fixedItemId: "rent", type: "expense", amount: 1200, month: 11, year: 2026 }],
    });
    await screen.findByRole("button", { name: "Editar Aluguel" });
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(await screen.findByRole("button", { name: "Editar Aluguel" }));
    await user.click(screen.getByRole("button", { name: "Alterar só o valor de dezembro" }));
    const panel = await screen.findByRole("dialog", { name: "Valor de dezembro" });
    const input = within(panel).getByLabelText("Valor neste mês");
    expect((input as HTMLInputElement).value).toContain("1.200");
    await user.clear(input);
    await user.type(input, "0");
    await user.click(within(panel).getByRole("button", { name: "Salvar valor do mês" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "post" && r.url === "/recurring/rent/variation")?.data).toEqual({
      year: 2026,
      month: 11,
      amount: 0,
      type: "expense",
    });

    await user.click(screen.getByRole("button", { name: "Encerradas (1)" }));
    await user.click(screen.getByRole("button", { name: "Editar Assinatura antiga" }));
    const form = await screen.findByRole("dialog", { name: "Editar recorrência" });
    expect(within(form).getByLabelText("Termina")).toHaveValue("date");
    expect(within(form).getByLabelText("Data final")).toHaveValue("2026-10-01");
    expect(within(form).queryByRole("button", { name: "Encerrar recorrência" })).not.toBeInTheDocument();
  });

  it("troca a categoria a partir do mês atual mesmo com o lançamento do mês já feito", async () => {
    const gym = { id: "gym", name: "Academia", type: "expense", active: true, color: "#5d6b80" };
    const health = { id: "health", name: "Saúde", type: "expense", active: true, color: "#16836b" };
    const plan = {
      ...rentWithVersions,
      id: "plan",
      description: "Plano",
      day: 1,
      categoryId: "health",
      versions: [{ effectiveFrom: "2026-01-01", amount: 1500, categoryId: "health", day: 1 }],
    };
    const user = renderRecurring({ "/recurring?type=expense": [plan], "/categories": [health, gym] });
    await user.click(await screen.findByRole("button", { name: "Editar Plano" }));
    const form = await screen.findByRole("dialog", { name: "Editar recorrência" });
    await user.selectOptions(within(form).getByLabelText("Categoria"), "gym");
    // Lançamento do dia 1 já aconteceu em 3/nov, e ainda assim o padrão é novembro.
    expect(within(form).getByLabelText("Mês de início da alteração")).toHaveValue("2026-11");
    await user.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const put = requests.find((r) => r.method === "put" && r.url === "/recurring/plan");
    expect(put?.data).toMatchObject({ categoryId: "gym", scope: "from", effectiveFrom: "2026-11" });
  });

  it("edita o valor a partir de um mês, sem reescrever o histórico", async () => {
    const user = renderRecurring({ "/recurring?type=expense": [rentWithVersions] });
    await user.click(await screen.findByRole("button", { name: "Editar Aluguel" }));
    const form = await screen.findByRole("dialog", { name: "Editar recorrência" });
    expect(within(form).getByText("R$ 1.400,00 desde jan/2026")).toBeInTheDocument();
    // Categoria mantida e nada mudou: sem escolha de escopo.
    expect(within(form).getByLabelText("Categoria")).toHaveValue("food");
    expect(within(form).queryByText("Quando a alteração vale")).not.toBeInTheDocument();

    await user.clear(within(form).getByLabelText("Valor"));
    await user.type(within(form).getByLabelText("Valor"), "1650");
    expect(within(form).getByText("Quando a alteração vale")).toBeInTheDocument();
    expect(within(form).getAllByRole("radio")[0]).toBeChecked();
    // Padrão: o mês atual.
    expect(within(form).getByLabelText("Mês de início da alteração")).toHaveValue("2026-11");
    await user.selectOptions(within(form).getByLabelText("Mês de início da alteração"), "2026-12");
    await user.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const put = requests.find((r) => r.method === "put" && r.url === "/recurring/rent");
    expect(put?.data).toMatchObject({ amount: 1650, scope: "from", effectiveFrom: "2026-12" });
    expect(put?.data).not.toHaveProperty("categoryId");
    expect(put?.data).not.toHaveProperty("day");
  });

  it("corrige todo o histórico e só avisa sobre reajustes quando o valor muda", async () => {
    const user = renderRecurring({ "/recurring?type=expense": [rentWithVersions] });
    await user.click(await screen.findByRole("button", { name: "Editar Aluguel" }));
    const form = await screen.findByRole("dialog", { name: "Editar recorrência" });
    await user.clear(within(form).getByLabelText("Todo dia"));
    await user.type(within(form).getByLabelText("Todo dia"), "15");
    await user.click(within(form).getByLabelText("Corrigir todo o histórico"));
    expect(within(form).queryByText(/Substitui os reajustes/)).not.toBeInTheDocument();
    await user.clear(within(form).getByLabelText("Valor"));
    await user.type(within(form).getByLabelText("Valor"), "1550");
    expect(within(form).getByText(/Substitui os reajustes anteriores/)).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const put = requests.find((r) => r.method === "put" && r.url === "/recurring/rent");
    expect(put?.data).toMatchObject({ day: 15, amount: 1550, scope: "all" });
    expect(put?.data).not.toHaveProperty("categoryId");
    expect(put?.data).not.toHaveProperty("effectiveFrom");
  });

  it("encerra uma recorrência depois de confirmar", async () => {
    const user = renderRecurring({ "/recurring?type=expense": [rentWithVersions] });
    await user.click(await screen.findByRole("button", { name: "Editar Aluguel" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Editar recorrência" })).getByRole("button", { name: "Pausar ou encerrar" }));
    const sheet = await screen.findByRole("dialog", { name: "Pausar ou encerrar “Aluguel”?" });
    await user.click(within(sheet).getByLabelText(/Encerrar/));
    await user.click(within(sheet).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(requests.some((r) => r.method === "delete" && r.url === "/recurring/rent")).toBe(true));
  });

  it("pausa o próximo lançamento por um mês e lista a pausada", async () => {
    const user = renderRecurring({ "/recurring?type=expense": [rentWithVersions] });
    await user.click(await screen.findByRole("button", { name: "Editar Aluguel" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Editar recorrência" })).getByRole("button", { name: "Pausar ou encerrar" }));
    const sheet = await screen.findByRole("dialog", { name: "Pausar ou encerrar “Aluguel”?" });
    // 3/nov e o aluguel cai dia 10: a pausa vale para novembro e volta em dezembro.
    expect(within(sheet).getByText("Não lança em novembro. Volta a lançar em dezembro, dia 10.")).toBeVisible();
    await user.click(within(sheet).getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(requests.find((r) => r.method === "put" && r.url === "/recurring/rent")?.data).toEqual({ pausedFrom: "2026-11", pausedUntil: "2026-11" }),
    );
  });

  it("não lança no mês pausado e mostra a seção de pausadas", async () => {
    const user = renderRecurring({ "/recurring?type=expense": [{ ...rentWithVersions, pausedFrom: "2026-11", pausedUntil: "2026-11" }] });
    expect(await screen.findByRole("region", { name: "Pausadas em novembro" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Próximas" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar Aluguel" }));
    expect(within(await screen.findByRole("dialog", { name: "Editar recorrência" })).getByText("Pausada em novembro de 2026")).toBeVisible();
  });
});
