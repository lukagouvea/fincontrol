import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CentsInput, digitsToCents } from "./CentsInput";

function Harness({ initial = null }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <CentsInput aria-label="Valor" value={value} onValueChange={setValue} />
      <output data-testid="value">{String(value)}</output>
    </>
  );
}

describe("valor em modo centavos", () => {
  it("dígitos entram pela direita", async () => {
    render(<Harness />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Valor");
    await user.type(input, "2000");
    expect(input).toHaveValue("R$ 20,00");
    expect(screen.getByTestId("value")).toHaveTextContent("20");
    await user.type(input, "5");
    expect(input).toHaveValue("R$ 200,05");
  });

  it("apagar tira o último dígito e zerar deixa vazio", async () => {
    render(<Harness initial={19.9} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Valor");
    expect(input).toHaveValue("R$ 19,90");
    await user.click(input);
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("R$ 1,99");
    await user.keyboard("{Backspace}{Backspace}{Backspace}");
    expect(input).toHaveValue("");
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });

  it("colar um valor com vírgula entende reais", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Valor");
    fireEvent.paste(input, { clipboardData: { getData: () => "R$ 1.234,5" } });
    expect(input).toHaveValue("R$ 1.234,50");
    fireEvent.paste(input, { clipboardData: { getData: () => "89.9" } });
    expect(input).toHaveValue("R$ 89,90");
  });

  it("ignora letras e limita o tamanho", () => {
    expect(digitsToCents("R$ 12a3")).toBe(123);
    expect(digitsToCents("0012")).toBe(12);
    expect(digitsToCents("1".repeat(20))).toBe(Number("1".repeat(11)));
  });
});
