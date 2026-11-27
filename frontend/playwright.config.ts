import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta: o app de verdade (Vite) falando com o backend de
 * verdade. Precisa do backend + banco no ar (docker compose de dev, ou o job
 * de e2e do CI). O Vite sobe sozinho em :5174; se já estiver rodando, é reaproveitado.
 * Cada roteiro cria a própria conta (e-mail único) e a exclui no fim.
 *
 * Variáveis: E2E_URL (outro endereço do app; não sobe o Vite), E2E_PORT (porta do
 * Vite, padrão 5174), E2E_API (backend,
 * padrão http://localhost:3001), E2E_CHANNEL (navegador; padrão Chrome instalado
 * na máquina, e o Chromium do Playwright no CI).
 */
const CI = !!process.env.CI;
const port = process.env.E2E_PORT ?? "5174";
const url = process.env.E2E_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  outputDir: ".e2e/results",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: CI,
  // Sem nova tentativa: um teste instável deve aparecer, não ser escondido.
  retries: 0,
  reporter: CI
    ? [["github"], ["list"], ["html", { outputFolder: ".e2e/report", open: "never" }]]
    : [["list"], ["html", { outputFolder: ".e2e/report", open: "never" }]],
  use: {
    baseURL: url,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    channel: process.env.E2E_CHANNEL || (CI ? undefined : "chrome"),
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: `npx vite --port ${port} --strictPort`,
        url,
        reuseExistingServer: !CI,
        timeout: 120_000,
        env: { API_PROXY_TARGET: process.env.E2E_API ?? "http://localhost:3001", VITE_API_URL: "/api" },
      },
  projects: [
    { name: "android", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: false } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
});
