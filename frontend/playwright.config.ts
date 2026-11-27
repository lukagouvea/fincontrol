import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta: o app de verdade (Vite) falando com o backend de
 * verdade. Suba antes o backend + banco (docker compose de dev) e o Vite:
 *   API_PROXY_TARGET=http://localhost:3001 VITE_API_URL=/api npx vite --port 5174
 * Cada roteiro cria a própria conta (e-mail único) e a exclui no fim.
 */
export default defineConfig({
  testDir: "e2e",
  outputDir: ".e2e/results",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: ".e2e/report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:5174",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    channel: process.env.E2E_CHANNEL ?? "chrome",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "android", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: false } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
});
