import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// As telas montam várias consultas em paralelo (livro, orçamento, cartões,
// alertas); com a suíte inteira rodando, 1 s às vezes não basta.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => cleanup());
const portalRoot = document.createElement("div");
portalRoot.id = "modal-root";
document.body.appendChild(portalRoot);
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
