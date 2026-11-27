import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import type { ReactNode } from "react";
import type { Card } from "../../types/FinanceTypes";
import type { Invoice } from "../invoice";
import { ToastProvider } from "../../ui/Toast";
import { PayInvoiceSheet } from "./PayInvoiceSheet";

const card: Card = { id: "c1", name: "Aurora", last4: "4821", limit: 5000, closingDay: 5, dueDay: 12, color: "verde", archived: false, payments: [] };
const invoice = (): Invoice => ({
  key: "2026-12",
  closingDate: "2026-12-05",
  dueDate: "2026-12-12",
  items: [],
  total: 610,
  paid: 0,
  remaining: 610,
  status: "fechada" as Invoice["status"],
});

const client = new QueryClient();
const wrap = (node: ReactNode) => (
  <QueryClientProvider client={client}>
    <ToastProvider>{node}</ToastProvider>
  </QueryClientProvider>
);

it("uma recarga dos dados (mesma fatura, objeto novo) não apaga o valor digitado", async () => {
  const { rerender } = render(wrap(<PayInvoiceSheet card={card} invoice={invoice()} available={5000} onClose={() => {}} />));
  const user = userEvent.setup();
  await user.click(screen.getByRole("radio", { name: "Outro valor" }));
  await user.type(screen.getByLabelText("Valor pago"), "350");
  expect(screen.getByLabelText("Valor pago")).toHaveValue("R$ 350");

  // Ex.: refetch ao voltar para a aba: useCardInvoices recria os objetos.
  rerender(wrap(<PayInvoiceSheet card={{ ...card }} invoice={invoice()} available={5000} onClose={() => {}} />));
  expect(screen.getByRole("radio", { name: "Outro valor" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByLabelText("Valor pago")).toHaveValue("R$ 350");
});
