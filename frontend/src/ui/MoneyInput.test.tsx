import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MoneyInput, digitsToCents, normalizeDecimal, parsePastedMoney, type MoneyInputMode } from "./MoneyInput";

function Harness({ mode, initial = null }: { mode?: MoneyInputMode; initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <MoneyInput aria-label="Valor" mode={mode} value={value} onValueChange={setValue} />
      <output data-testid="value">{String(value)}</output>
      <button type="button" onClick={() => setValue(null)}>Limpar</button>
      <button type="button" onClick={() => setValue(500)}>Sugestão</button>
    </>
  );
}

const typed = async (mode: MoneyInputMode | undefined, text: string) => {
  render(<Harness mode={mode} />);
  await userEvent.setup().type(screen.getByLabelText("Valor"), text);
  return { input: screen.getByLabelText("Valor"), value: screen.getByTestId("value").textContent };
};

describe("valor no modo decimal (padrão)", () => {
  it.each([
    ["1650", "R$ 1.650", "1650"],
    ["19,9", "R$ 19,9", "19.9"],
    ["19,", "R$ 19,", "19"],
    ["19,999", "R$ 19,99", "19.99"],
    ["0,5", "R$ 0,5", "0.5"],
    ["007", "R$ 7", "7"],
    ["1.234", "R$ 1.234", "1234"],
    ["1a2", "R$ 12", "12"],
    ["-5", "R$ 5", "5"],
    ["1234567,89", "R$ 1.234.567,89", "1234567.89"],
  ])("digitar %s mostra %s", async (text, shown, value) => {
    const result = await typed(undefined, text);
    expect((result.input as HTMLInputElement).value.replace(/ /g, " ")).toBe(shown);
    expect(result.value).toBe(value);
  });

  it("mostra o valor inicial e acompanha mudanças de fora", async () => {
    render(<Harness initial={1650.5} />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    expect(input.value.replace(/ /g, " ")).toBe("R$ 1.650,5");
    await userEvent.setup().click(screen.getByRole("button", { name: "Limpar" }));
    expect(input).toHaveValue("");
    await userEvent.setup().click(screen.getByRole("button", { name: "Sugestão" }));
    expect(input.value.replace(/ /g, " ")).toBe("R$ 500");
  });

  it("apagar tudo deixa vazio", async () => {
    render(<Harness initial={12} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Valor"));
    expect(screen.getByLabelText("Valor")).toHaveValue("");
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });
});

describe("valor no modo centavos", () => {
  it("esconde o cursor, que só pode ficar no fim (no modo decimal ele aparece)", () => {
    const { unmount } = render(<Harness mode="cents" />);
    expect(screen.getByLabelText("Valor")).toHaveClass("caret-transparent");
    unmount();
    render(<Harness />);
    expect(screen.getByLabelText("Valor")).not.toHaveClass("caret-transparent");
  });

  it("dígitos entram pela direita", async () => {
    render(<Harness mode="cents" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Valor");
    await user.type(input, "2000");
    expect(input).toHaveValue("R$ 20,00");
    expect(screen.getByTestId("value")).toHaveTextContent("20");
    await user.type(input, "5");
    expect(input).toHaveValue("R$ 200,05");
  });

  it("apagar tira o último dígito e zerar deixa vazio", async () => {
    render(<Harness mode="cents" initial={19.9} />);
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

  it("tocar no meio do número não muda de onde o apagar tira", async () => {
    render(<Harness mode="cents" initial={45.9} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    await user.click(input);
    input.setSelectionRange(4, 4);
    fireEvent.select(input);
    expect(input.selectionStart).toBe(input.value.length);
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("R$ 4,59");
  });

  it("não deixa selecionar trecho nem tudo: o cursor volta para o fim", () => {
    render(<Harness mode="cents" initial={45.9} />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, input.value.length);
    fireEvent.select(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([input.value.length, input.value.length]);
  });

  it("o teclado nunca edita o meio: dígito entra no fim e apagar tira o último", () => {
    render(<Harness mode="cents" initial={45.9} />);
    const input = screen.getByLabelText("Valor") as HTMLInputElement;
    const press = (inputType: string, data: string | null = null) => {
      const event = new InputEvent("beforeinput", { inputType, data, cancelable: true, bubbles: true });
      act(() => {
        input.dispatchEvent(event);
      });
      return event.defaultPrevented;
    };
    expect(press("insertText", "1")).toBe(true);
    expect(input).toHaveValue("R$ 459,01");
    expect(press("deleteContentBackward")).toBe(true);
    expect(input).toHaveValue("R$ 45,90");
    expect(press("insertText", "a")).toBe(true);
    expect(input).toHaveValue("R$ 45,90");
    expect(press("deleteWordBackward")).toBe(true);
    expect(input).toHaveValue("");
    expect(screen.getByTestId("value")).toHaveTextContent("null");
  });
});

describe("colar", () => {
  it.each<[MoneyInputMode]>([["decimal"], ["cents"]])("no modo %s, valor com vírgula ou ponto é lido como reais", (mode) => {
    render(<Harness mode={mode} />);
    const input = screen.getByLabelText("Valor");
    fireEvent.paste(input, { clipboardData: { getData: () => "R$ 1.234,5" } });
    expect(screen.getByTestId("value")).toHaveTextContent("1234.5");
    fireEvent.paste(input, { clipboardData: { getData: () => "89.9" } });
    expect(screen.getByTestId("value")).toHaveTextContent("89.9");
  });

  it("reconhece os formatos comuns", () => {
    expect(parsePastedMoney("R$ 1.234,56")).toBe(1234.56);
    expect(parsePastedMoney("1,234.56")).toBe(1234.56);
    expect(parsePastedMoney("1.234")).toBe(1234);
    expect(parsePastedMoney("12.50")).toBe(12.5);
    expect(parsePastedMoney("abc")).toBeNull();
  });
});

describe("funções puras", () => {
  it("modo centavos ignora letras e limita o tamanho", () => {
    expect(digitsToCents("R$ 12a3")).toBe(123);
    expect(digitsToCents("0012")).toBe(12);
    expect(digitsToCents("1".repeat(20))).toBe(Number("1".repeat(11)));
  });

  it("modo decimal normaliza o texto", () => {
    expect(normalizeDecimal("R$ 1.650")).toBe("1650");
    expect(normalizeDecimal(",5")).toBe("0,5");
    expect(normalizeDecimal("1,2,3")).toBe("1,23");
    expect(normalizeDecimal("")).toBe("");
  });
});
