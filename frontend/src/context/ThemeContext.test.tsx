import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeContext";

function ThemeControl() {
  const { theme, toggleTheme, setPreference } = useTheme();
  return (
    <>
      <button onClick={toggleTheme}>{theme}</button>
      <button onClick={() => setPreference("system")}>auto</button>
    </>
  );
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
  delete document.documentElement.dataset.theme;
});

it.each([
  { dark: false, theme: "light" },
  { dark: true, theme: "dark" },
])(
  "usa o sistema ($theme) sem salvar uma escolha automática",
  ({ dark, theme }) => {
    systemTheme(dark);
    renderTheme();
    expect(screen.getAllByRole("button")[0]).toHaveTextContent(theme);
    expect(document.documentElement.dataset.theme).toBe(theme);
    expect(localStorage.getItem("theme")).toBeNull();
  },
);

it("acompanha mudanças do sistema enquanto não há preferência manual", () => {
  const changeSystem = systemTheme(false);
  renderTheme();
  changeSystem(true);
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  changeSystem(false);
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("light");
  expect(document.documentElement.dataset.theme).not.toBe("dark");
  expect(localStorage.getItem("theme")).toBeNull();
});

it("salva a escolha manual, ignora o sistema e mantém a escolha ao reabrir", async () => {
  const changeSystem = systemTheme(false);
  const view = renderTheme();
  await userEvent.click(screen.getAllByRole("button")[0]);
  expect(localStorage.getItem("theme")).toBe("dark");
  changeSystem(true);
  changeSystem(false);
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("dark");
  view.unmount();
  renderTheme();
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("dark");
});

it("respeita a preferência clara salva mesmo com sistema escuro", () => {
  const changeSystem = systemTheme(true);
  localStorage.setItem("theme", "light");
  renderTheme();
  expect(document.documentElement.dataset.theme).toBe("light");
  changeSystem(false);
  changeSystem(true);
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("light");
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
  expect(screen.getAllByRole("button")[0]).toHaveTextContent("dark");
  await userEvent.click(screen.getAllByRole("button")[0]);
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("volta a seguir o sistema ao escolher Automático", async () => {
  const changeSystem = systemTheme(false);
  localStorage.setItem("theme", "dark");
  renderTheme();
  expect(document.documentElement.dataset.theme).toBe("dark");
  await userEvent.click(screen.getByRole("button", { name: "auto" }));
  expect(localStorage.getItem("theme")).toBeNull();
  expect(document.documentElement.dataset.theme).toBe("light");
  changeSystem(true);
  expect(document.documentElement.dataset.theme).toBe("dark");
});
