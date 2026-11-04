import { afterEach, expect, it, vi } from "vitest";
import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";
import { installApiFixture } from "../test/fixtures";
import type { InternalAxiosRequestConfig } from "axios";

afterEach(() => vi.useRealTimers());

it.each([
  {
    year: 2026,
    month: 10,
    name: "novembro de 2026",
    first: "2026-10-25",
    last: "2026-12-05",
    startIndex: 7,
    count: 30,
  },
  {
    year: 2023,
    month: 0,
    name: "janeiro de 2023",
    first: "2022-12-25",
    last: "2023-02-04",
    startIndex: 7,
    count: 31,
  },
  {
    year: 2026,
    month: 7,
    name: "agosto de 2026",
    first: "2026-07-26",
    last: "2026-09-05",
    startIndex: 6,
    count: 31,
  },
  {
    year: 2024,
    month: 1,
    name: "fevereiro de 2024",
    first: "2024-01-28",
    last: "2024-03-09",
    startIndex: 4,
    count: 29,
  },
])(
  "exibe dias dos dois meses vizinhos em $name com uma grade de 42 dias",
  async ({ year, month, name, first, last, startIndex, count }) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(year, month, 4, 12));
    installApiFixture();
    window.history.replaceState({}, "", "/calendario");
    render(<App />);
    const grid = await screen.findByRole("group", { name });
    const days = within(grid).getAllByRole("button");
    expect(days).toHaveLength(42);
    expect(days[0]).toHaveAttribute("id", "calendar-day-" + first);
    expect(days[0]).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/^domingo,/),
    );
    expect(days[41]).toHaveAttribute("id", "calendar-day-" + last);
    expect(days[startIndex]).toHaveAttribute(
      "id",
      `calendar-day-${year}-${String(month + 1).padStart(2, "0")}-01`,
    );
    expect(
      days.filter((day) => !day.classList.contains("other-month")),
    ).toHaveLength(count);
    expect(new Set(days.map((day) => day.id)).size).toBe(42);
  },
);

it.each([
  {
    label: /27 de dezembro de 2026/,
    date: "2026-12-27",
    description: "Conta de dezembro",
    type: "expense",
    action: "Adicionar despesa",
  },
  {
    label: /, 1 de fevereiro de 2027,/,
    date: "2027-02-01",
    description: "Receita de fevereiro",
    type: "income",
    action: "Adicionar receita",
  },
])(
  "navega para o mês de $date e preserva a data da agenda",
  async ({ label, date, description, type, action }) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 15, 12));
    installApiFixture({
      "/transactions": (config: InternalAxiosRequestConfig) => {
        return `${config.params?.year}-${String(config.params?.month).padStart(2, "0")}` ===
          date.slice(0, 7)
          ? [
              {
                id: date,
                type,
                description,
                date: date + "T12:00:00Z",
                amount: 85,
                categoryId: type === "income" ? "salary" : "food",
                ...(type === "expense" ? { isInstallment: false } : {}),
              },
            ]
          : [];
      },
    });
    window.history.replaceState({}, "", "/calendario");
    render(<App />);
    const grid = await screen.findByRole("group", { name: "janeiro de 2027" });
    const day = within(grid).getByRole("button", { name: label });
    const user = userEvent.setup();
    await user.click(day);
    const month = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    const nextGrid = await screen.findByRole("group", { name: month });
    expect(
      within(nextGrid).getByRole("button", { name: label }),
    ).toHaveAttribute("aria-pressed", "true");
    const agenda = screen.getByRole("region", { name: /Agenda do dia/ });
    expect(within(agenda).getByText(description)).toBeVisible();
    await user.click(within(agenda).getByRole("button", { name: action }));
    expect(screen.getByLabelText("Data")).toHaveValue(date);
  },
);

it("navega para o mês anterior por teclado e mantém o foco no dia selecionado", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2027, 0, 15, 12));
  installApiFixture();
  window.history.replaceState({}, "", "/calendario");
  render(<App />);
  const grid = await screen.findByRole("group", { name: "janeiro de 2027" });
  const user = userEvent.setup();
  await user.click(
    within(grid).getByRole("button", { name: /, 1 de janeiro de 2027,/ }),
  );
  await user.keyboard("{ArrowLeft}");
  const previousGrid = await screen.findByRole("group", {
    name: "dezembro de 2026",
  });
  const december = within(previousGrid).getByRole("button", {
    name: /31 de dezembro de 2026/,
  });
  await waitFor(() => expect(december).toHaveFocus());
  expect(december).toHaveAttribute("aria-pressed", "true");
});

it("sincroniza Hoje com o período consultado depois de navegar para meses distantes", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
  installApiFixture({
    "/transactions": (config: InternalAxiosRequestConfig) =>
      config.params?.month === 11
        ? [
            {
              id: "nov",
              type: "expense",
              description: "Mercado de novembro",
              date: "2026-11-03T12:00:00Z",
              amount: 85,
              categoryId: "food",
              isInstallment: false,
            },
          ]
        : [],
  });
  window.history.replaceState({}, "", "/calendario");
  render(<App />);
  const user = userEvent.setup();
  await screen.findByRole("heading", { name: "Calendário", level: 1 });
  for (let i = 0; i < 4; i++)
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
  await user.click(screen.getByRole("button", { name: "Hoje" }));
  const agenda = await screen.findByRole("region", { name: /Agenda do dia/ });
  expect(within(agenda).getByText("Mercado de novembro")).toBeVisible();
  await user.click(
    within(agenda).getByRole("button", { name: "Adicionar despesa" }),
  );
  expect(screen.getByLabelText("Data")).toHaveValue("2026-11-03");
});

it("pré-carrega meses próximos e preserva a grade enquanto um mês da borda carrega", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2027, 0, 15, 12));
  const periods: string[] = [];
  let finishMarch!: (value: unknown) => void;
  const march = new Promise((resolve) => {
    finishMarch = resolve;
  });
  installApiFixture({
    "/transactions": (config: InternalAxiosRequestConfig) => {
      const period = `${config.params?.year}-${config.params?.month}`;
      periods.push(period);
      if (period === "2027-3") return march;
      return period === "2027-2"
        ? [
            {
              id: "feb",
              type: "income",
              description: "Salário de fevereiro",
              date: "2027-02-01T12:00:00Z",
              amount: 2000,
              categoryId: "salary",
            },
          ]
        : [];
    },
  });
  window.history.replaceState({}, "", "/calendario");
  render(<App />);
  const grid = await screen.findByRole("group", { name: "janeiro de 2027" });
  await waitFor(() =>
    expect(periods).toEqual(
      expect.arrayContaining([
        "2026-11",
        "2026-12",
        "2027-1",
        "2027-2",
        "2027-3",
      ]),
    ),
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Próximo mês" }));
  expect(screen.getByRole("group", { name: "fevereiro de 2027" })).toBe(grid);
  expect(within(grid).getAllByRole("button")).toHaveLength(42);
  let agenda = screen.getByRole("region", { name: /Agenda do dia/ });
  expect(within(agenda).getByText("Salário de fevereiro")).toBeVisible();
  expect(within(agenda).queryByRole("status")).not.toBeInTheDocument();
  await user.click(
    within(grid).getByRole("button", { name: /, 1 de março de 2027,/ }),
  );
  expect(screen.getByRole("group", { name: "março de 2027" })).toBe(grid);
  agenda = screen.getByRole("region", { name: /Agenda do dia/ });
  expect(within(agenda).getByRole("status")).toHaveTextContent("Carregando");
  expect(within(agenda).queryByText("Saldo do dia")).not.toBeInTheDocument();
  expect(
    within(agenda).queryByText("Dia livre de movimentações"),
  ).not.toBeInTheDocument();
  await act(async () =>
    finishMarch([
      {
        id: "march",
        type: "expense",
        description: "Conta de março",
        date: "2027-03-01T12:00:00Z",
        amount: 400,
        categoryId: "food",
        isInstallment: false,
      },
    ]),
  );
  expect(await within(agenda).findByText("Conta de março")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Mês anterior" }));
  expect(screen.getByRole("group", { name: "fevereiro de 2027" })).toBe(grid);
  expect(screen.getByText("Salário de fevereiro")).toBeVisible();
  expect(periods.filter((period) => period === "2027-2")).toHaveLength(1);
});

it("mantém a grade se um mês falhar e permite tentar carregar a agenda novamente", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2027, 0, 15, 12));
  let failing = true;
  installApiFixture({
    "/transactions": (config: InternalAxiosRequestConfig) => {
      if (config.params?.year !== 2026 || config.params?.month !== 12)
        return [];
      if (failing) return new Error("Sem conexão");
      return [
        {
          id: "dec",
          type: "expense",
          description: "Conta recuperada",
          date: "2026-12-31T12:00:00Z",
          amount: 90,
          categoryId: "food",
          isInstallment: false,
        },
      ];
    },
  });
  window.history.replaceState({}, "", "/calendario");
  render(<App />);
  const grid = await screen.findByRole("group", { name: "janeiro de 2027" });
  const user = userEvent.setup();
  const day = await within(grid).findByRole(
    "button",
    { name: /31 de dezembro de 2026, movimentações indisponíveis/ },
    { timeout: 3000 },
  );
  await user.click(day);
  expect(screen.getByRole("group", { name: "dezembro de 2026" })).toBe(grid);
  const agenda = screen.getByRole("region", { name: /Agenda do dia/ });
  expect(within(agenda).getByRole("alert")).toHaveTextContent(
    "Não foi possível carregar",
  );
  expect(within(agenda).queryByText("Saldo do dia")).not.toBeInTheDocument();
  failing = false;
  await user.click(
    within(agenda).getByRole("button", { name: "Tentar novamente" }),
  );
  expect(await within(agenda).findByText("Conta recuperada")).toBeVisible();
  expect(within(agenda).getAllByText(/90,00/).length).toBeGreaterThan(0);
});
