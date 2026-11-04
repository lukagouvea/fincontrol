import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { useInvestmentSettings } from "./useInvestmentSettings";
import { installApiFixture } from "../test/fixtures";

it("ignora uma resposta de investimento da sessão anterior após a troca de conta", async () => {
  let finish!: (value: { defaultMonthlyAmount: number }) => void;
  let saving!: Promise<unknown>;
  const delayed = new Promise<{ defaultMonthlyAmount: number }>((resolve) => {
    finish = resolve;
  });
  installApiFixture({ "put /investment": () => delayed });
  function SessionHarness() {
    const auth = useAuth();
    const investment = useInvestmentSettings();
    return (
      <div>
        <p>{auth.currentUser?.name || "Sem sessão"}</p>
        <output aria-label="Investimento atual">
          {investment.investmentMonthlyAmount}
        </output>
        <button
          onClick={() => {
            saving = investment.saveInvestment(111);
          }}
        >
          Salvar investimento
        </button>
        <button onClick={() => void auth.logout()}>Sair</button>
        <button
          onClick={() =>
            void auth.login({ email: "bia@example.test", password: "123456" })
          }
        >
          Entrar como Bia
        </button>
      </div>
    );
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthProvider>
        <SessionHarness />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await waitFor(() =>
    expect(screen.getByLabelText("Investimento atual")).toHaveTextContent(
      "200",
    ),
  );
  await user.click(screen.getByRole("button", { name: "Salvar investimento" }));
  await user.click(screen.getByRole("button", { name: "Sair" }));
  await screen.findByText("Sem sessão");
  installApiFixture({
    "post /auth/login": {
      user: { id: "bia", name: "Bia", email: "bia@example.test" },
    },
    "/investment": { defaultMonthlyAmount: 222 },
  });
  await user.click(screen.getByRole("button", { name: "Entrar como Bia" }));
  await screen.findByText("Bia");
  await waitFor(() =>
    expect(screen.getByLabelText("Investimento atual")).toHaveTextContent(
      "222",
    ),
  );
  await act(async () => {
    finish({ defaultMonthlyAmount: 111 });
    await saving;
  });
  expect(screen.getByLabelText("Investimento atual")).toHaveTextContent("222");
});
