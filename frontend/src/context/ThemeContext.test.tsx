import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeControl() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemeControl />
    </ThemeProvider>,
  );
}

function systemTheme(dark: boolean) {
  const changes = new EventTarget();
  const media = {
    matches: dark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: changes.addEventListener.bind(changes),
    removeEventListener: changes.removeEventListener.bind(changes),
    dispatchEvent: changes.dispatchEvent.bind(changes),
  };
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  return (nextDark: boolean) => {
    media.matches = nextDark;
    act(() => {
      changes.dispatchEvent(
        Object.assign(new Event("change"), { matches: nextDark }),
      );
    });
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

it.each([
  { dark: false, theme: "light" },
  { dark: true, theme: "dark" },
])(
  "usa o sistema ($theme) sem salvar uma escolha automática",
  ({ dark, theme }) => {
    systemTheme(dark);
    renderTheme();
    expect(screen.getByRole("button")).toHaveTextContent(theme);
    expect(document.documentElement).toHaveClass(theme);
    expect(localStorage.getItem("theme")).toBeNull();
  },
);

it("acompanha mudanças do sistema enquanto não há preferência manual", () => {
  const changeSystem = systemTheme(false);
  renderTheme();
  changeSystem(true);
  expect(screen.getByRole("button")).toHaveTextContent("dark");
  expect(document.documentElement).toHaveClass("dark");
  changeSystem(false);
  expect(screen.getByRole("button")).toHaveTextContent("light");
  expect(document.documentElement).not.toHaveClass("dark");
  expect(localStorage.getItem("theme")).toBeNull();
});

it("salva a escolha manual, ignora o sistema e mantém a escolha ao reabrir", async () => {
  const changeSystem = systemTheme(false);
  const view = renderTheme();
  await userEvent.click(screen.getByRole("button"));
  expect(localStorage.getItem("theme")).toBe("dark");
  changeSystem(true);
  changeSystem(false);
  expect(screen.getByRole("button")).toHaveTextContent("dark");
  view.unmount();
  renderTheme();
  expect(screen.getByRole("button")).toHaveTextContent("dark");
});

it("respeita a preferência clara salva mesmo com sistema escuro", () => {
  const changeSystem = systemTheme(true);
  localStorage.setItem("theme", "light");
  renderTheme();
  expect(document.documentElement).toHaveClass("light");
  changeSystem(false);
  changeSystem(true);
  expect(screen.getByRole("button")).toHaveTextContent("light");
});

it("permite alternar o tema quando o armazenamento está indisponível", async () => {
  systemTheme(true);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Storage disabled");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage disabled");
  });
  renderTheme();
  expect(screen.getByRole("button")).toHaveTextContent("dark");
  await userEvent.click(screen.getByRole("button"));
  expect(document.documentElement).toHaveClass("light");
});
