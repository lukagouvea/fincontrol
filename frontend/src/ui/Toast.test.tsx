import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastOptions } from "./Toast";

let show: (options: ToastOptions) => void = () => {};
function Capture() {
  show = useToast();
  return null;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Toast com desfazer", () => {
  it("efetiva ao expirar e não chama a ação", () => {
    const onAction = vi.fn();
    const onExpire = vi.fn();
    render(<ToastProvider><Capture /></ToastProvider>);
    act(() => show({ message: "Transação excluída", actionLabel: "Desfazer", onAction, onExpire }));
    expect(screen.getByText("Transação excluída")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.queryByText("Transação excluída")).not.toBeInTheDocument();
  });

  it("desfazer cancela a efetivação", () => {
    const onAction = vi.fn();
    const onExpire = vi.fn();
    render(<ToastProvider><Capture /></ToastProvider>);
    act(() => show({ message: "Excluída", actionLabel: "Desfazer", onAction, onExpire }));
    act(() => screen.getByRole("button", { name: "Desfazer" }).click());
    act(() => vi.advanceTimersByTime(10000));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("efetiva o pendente ao fechar a página ou ao mostrar outro toast", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<ToastProvider><Capture /></ToastProvider>);
    act(() => show({ message: "Um", onExpire: first }));
    act(() => show({ message: "Dois", onExpire: second }));
    expect(first).toHaveBeenCalledTimes(1);
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(second).toHaveBeenCalledTimes(1);
  });
});
