import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta: o app de verdade (Vite) falando com o backend de
 * verdade. Precisa do backend + banco no ar (docker compose de dev, ou o job
 * de e2e do CI). O Vite sobe sozinho em :5174; se já estiver rodando, é reaproveitado.
 * Cada roteiro cria a própria conta (e-mail único) e a exclui no fim.
 *
 * Projetos: android (360px, Chromium), iphone (390px, WebKit = motor do Safari)
 * e desktop (1280px, Chromium). O WebKit roda no CI; localmente só com
 * E2E_WEBKIT=1 (no Linux pede `sudo npx playwright install-deps webkit`) —
 * sem ele, o projeto iphone usa o Chromium em 390px.
 *
 * Variáveis: E2E_URL (outro endereço do app; não sobe o Vite), E2E_PORT (porta do
 * Vite, padrão 5174), E2E_API (backend, padrão http://localhost:3001),
 * E2E_CHANNEL (Chromium: padrão o Chrome instalado na máquina; no CI, o do Playwright).
 */
const CI = !!process.env.CI;
const port = process.env.E2E_PORT ?? "5174";
const url = process.env.E2E_URL ?? `http://localhost:${port}`;
const webkit = CI || process.env.E2E_WEBKIT === "1";
const chromium = { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || (CI ? undefined : "chrome") };

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
    { name: "android", use: { ...chromium, viewport: { width: 360, height: 780 }, hasTouch: true } },
    {
      name: "iphone",
      use: webkit
        ? { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } }
        : { ...chromium, viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    { name: "desktop", use: { ...chromium, viewport: { width: 1280, height: 900 } } },
  ],
});
