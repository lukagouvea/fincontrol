#!/usr/bin/env node
// Capturas para comparar o app com design/screens/.
//
// Uso:
//   npm run shots                       # app em SHOTS_URL (padrão http://localhost:5173)
//   npm run shots -- --ref Main DeskInicio   # telas de referência do design
//   npm run shots -- /transacoes /cartoes    # só algumas rotas do app
//
// Login: SHOTS_EMAIL e SHOTS_PASSWORD (opcional; sem eles captura só rotas públicas).
// Saída: frontend/.shots/<tema>-<largura>/<nome>.png
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../.shots");
const designDir = path.resolve(here, "../../design/screens");

const args = process.argv.slice(2);
const refMode = args[0] === "--ref";
const targets = refMode ? args.slice(1) : args;

const DEFAULT_ROUTES = [
  "/entrar",
  "/",
  "/transacoes",
  "/cartoes",
  "/orcamento",
  "/metas",
  "/recorrentes",
  "/relatorios",
  "/categorias",
  "/ajustes",
];

const widths = [390, 1280];
const themes = ["light", "dark"];
const baseUrl = process.env.SHOTS_URL ?? "http://localhost:5173";

const nameFor = (route) => (route === "/" ? "inicio" : route.replace(/^\//, "").replace(/\//g, "_"));

async function login(page) {
  const email = process.env.SHOTS_EMAIL;
  const password = process.env.SHOTS_PASSWORD;
  if (!email || !password) return false;
  await page.goto(`${baseUrl}/entrar`);
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/senha/i).first().fill(password);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 10_000 });
  return true;
}

async function main() {
  const browser = await chromium.launch({ channel: process.env.SHOTS_CHANNEL ?? "chrome" });
  try {
    for (const theme of themes) {
      for (const width of widths) {
        const dir = path.join(outRoot, refMode ? `ref-${theme}-${width}` : `${theme}-${width}`);
        await mkdir(dir, { recursive: true });
        const context = await browser.newContext({
          viewport: { width, height: width < 1024 ? 844 : 900 },
          deviceScaleFactor: 1,
          colorScheme: theme,
        });
        await context.addInitScript((t) => {
          try { localStorage.setItem("theme", t); } catch { /* sem storage */ }
        }, theme);
        const page = await context.newPage();

        if (refMode) {
          const ids = targets.length ? targets : ["Main", "DeskInicio"];
          for (const id of ids) {
            const isDesk = id.startsWith("Desk");
            if ((width >= 1024) !== isDesk) continue;
            const file = theme === "dark" ? `${id}Dark.html` : `${id}.html`;
            await page.goto(`file://${path.join(designDir, file)}`);
            await page.screenshot({ path: path.join(dir, `${id}.png`), fullPage: true });
          }
        } else {
          const loggedIn = await login(page);
          const routes = targets.length ? targets : DEFAULT_ROUTES;
          for (const route of routes) {
            if (!loggedIn && route !== "/entrar" && route !== "/criar-conta") continue;
            await page.goto(`${baseUrl}${route}`);
            await page.waitForLoadState("networkidle");
            await page.screenshot({ path: path.join(dir, `${nameFor(route)}.png`), fullPage: true });
          }
        }
        await context.close();
        console.log(`✓ ${theme} ${width}px → ${path.relative(process.cwd(), dir)}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
