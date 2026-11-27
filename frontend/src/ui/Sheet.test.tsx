import { useState, type FormEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { isKeyboardOpen } from "../hooks/useViewport";
import { Button } from "./Button";
import { Field, TextInput } from "./Field";
import { MoneyInput } from "./MoneyInput";
import { Sheet } from "./Sheet";

describe("teclado aberto", () => {
  it.each([
    [{ height: 800, scale: 1 }, 800, false],
    [{ height: 720, scale: 1 }, 800, false], // barra de endereço
    [{ height: 400, scale: 1 }, 800, true],
    [{ height: 400, scale: 2 }, 800, false], // zoom de pinça, sem teclado
    [null, 800, false],
  ])("%o numa janela de %ipx → %s", (viewport, windowHeight, open) => {
    expect(isKeyboardOpen(viewport, windowHeight)).toBe(open);
  });
});

function FormSheet({ onSubmit, busy = false }: { onSubmit: () => void; busy?: boolean }) {
  return (
    <Sheet
      open
      onClose={() => {}}
      title="Nova"
      footer={
        <Button type="submit" form="f" loading={busy}>
          Salvar
        </Button>
      }
    >
      <form
        id="f"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Descrição">
          <TextInput />
        </Field>
        <input type="checkbox" aria-label="Marcar" />
      </form>
    </Sheet>
  );
}

describe("Enter numa folha com rodapé", () => {
  it("aciona o botão do rodapé, que é o do formulário", async () => {
    const onSubmit = vi.fn();
    render(<FormSheet onSubmit={onSubmit} />);
    await userEvent.setup().type(screen.getByLabelText("Descrição"), "Mercado{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("não envia de novo enquanto salva", async () => {
    const onSubmit = vi.fn();
    render(<FormSheet onSubmit={onSubmit} busy />);
    await userEvent.setup().type(screen.getByLabelText("Descrição"), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("aciona o botão do rodapé sem formulário (campo de dinheiro)", async () => {
    const onClick = vi.fn();
    function Plain() {
      const [value, setValue] = useState<number | null>(null);
      return (
        <Sheet open onClose={() => {}} title="Pagar" footer={<Button onClick={onClick}>Confirmar</Button>}>
          <MoneyInput aria-label="Valor" value={value} onValueChange={setValue} />
        </Sheet>
      );
    }
    render(<Plain />);
    await userEvent.setup().type(screen.getByLabelText("Valor"), "12{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("os campos mostram a tecla Enter como Concluir", () => {
    render(<FormSheet onSubmit={() => {}} />);
    expect(screen.getByLabelText("Descrição")).toHaveAttribute("enterkeyhint", "done");
  });

  it("fora de folha os campos não mudam a tecla Enter", () => {
    render(<TextInput aria-label="Busca" />);
    expect(screen.getByLabelText("Busca")).not.toHaveAttribute("enterkeyhint");
  });

  it("deixa o navegador cuidar de um formulário que tem o próprio botão", async () => {
    const footerClick = vi.fn();
    const inner = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <Sheet open onClose={() => {}} title="Categoria" footer={<Button onClick={footerClick}>Fechar tudo</Button>}>
        <form onSubmit={inner}>
          <TextInput aria-label="Nome" />
          <button type="submit">Criar</button>
        </form>
      </Sheet>,
    );
    await userEvent.setup().type(screen.getByLabelText("Nome"), "Pets{Enter}");
    expect(footerClick).not.toHaveBeenCalled();
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
