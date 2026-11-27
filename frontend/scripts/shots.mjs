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
//
// Larguras: 360px (Android comum, ex.: Galaxy S25), 390px (iPhone) e 1280px (desktop).
// 390px usa o WebKit (motor do Safari) quando ele roda nesta máquina; senão cai
// no Chrome com um aviso (no Linux o WebKit pede `sudo npx playwright install-deps`).
// Toda rota do app é conferida contra rolagem horizontal: se alguma tela passar
// da largura, o script lista e termina com erro.
import { chromium, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const outRoot = path.resolve(here, "../.shots");
const designDir = path.resolve(here, "../../design/screens");

const args = process.argv.slice(2);
const refMode = args[0] === "--ref";
const targets = refMode ? args.slice(1) : args;

const PUBLIC_ROUTES = ["/boas-vindas", "/entrar", "/criar-conta"];
const DEFAULT_ROUTES = [
  "/boas-vindas",
  "/entrar",
  "/criar-conta",
  "/",
  "/transacoes",
  "/cartoes",
  "/orcamento",
  "/metas",
  "/recorrentes",
  "/relatorios",
  "/categorias",
  "/compromissos",
  "/relatorios/historico",
  "/alertas",
  "/importar",
  "/ajustes",
];

const DEVICES = [
  { width: 360, height: 780, label: "Android" },
  { width: 390, height: 844, label: "iPhone", engine: "webkit" },
  { width: 1280, height: 900, label: "desktop" },
];
// As referências do design só existem em 390 (celular) e 1280 (desktop).
const REF_WIDTHS = [390, 1280];
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

/** Quanto a página passa da largura da tela (0 = cabe). */
const horizontalOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function launchWebkit() {
  try {
    return await webkit.launch();
  } catch {
    console.warn("! WebKit indisponível nesta máquina: 390px vai no Chrome (veja o topo do script).");
    return null;
  }
}

async function main() {
  const chrome = await chromium.launch({ channel: process.env.SHOTS_CHANNEL ?? "chrome" });
  const safari = refMode ? null : await launchWebkit();
  const overflows = [];
  try {
    for (const theme of themes) {
      for (const device of DEVICES) {
        const { width, height } = device;
        if (refMode && !REF_WIDTHS.includes(width)) continue;
        const browser = device.engine === "webkit" && safari ? safari : chrome;
        const dir = path.join(outRoot, refMode ? `ref-${theme}-${width}` : `${theme}-${width}`);
        await mkdir(dir, { recursive: true });
        const context = await browser.newContext({
          viewport: { width, height },
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
          const routes = targets.length ? targets : DEFAULT_ROUTES;
          // Telas públicas antes do login: logado, /entrar redireciona para o Início.
          const isPublic = (route) => PUBLIC_ROUTES.includes(route);
          for (const route of routes.filter(isPublic)) {
            await page.goto(`${baseUrl}${route}`);
            await page.waitForLoadState("networkidle");
            const extra = await horizontalOverflow(page);
            if (extra > 0) overflows.push(`${route} em ${width}px (${theme}): passa ${extra}px da tela`);
            await page.screenshot({ path: path.join(dir, `${nameFor(route)}.png`), fullPage: true });
          }
          const loggedIn = await login(page);
          for (const route of routes.filter((route) => !isPublic(route))) {
            if (!loggedIn) continue;
            await page.goto(`${baseUrl}${route}`);
            await page.waitForLoadState("networkidle");
            const extra = await horizontalOverflow(page);
            if (extra > 0) overflows.push(`${route} em ${width}px (${theme}): passa ${extra}px da tela`);
            await page.screenshot({ path: path.join(dir, `${nameFor(route)}.png`), fullPage: true });
          }
        }
        await context.close();
        const engine = browser === safari ? "WebKit" : "Chrome";
        console.log(`✓ ${theme} ${width}px (${device.label}, ${engine}) → ${path.relative(process.cwd(), dir)}`);
      }
    }
  } finally {
    await chrome.close();
    await safari?.close();
  }
  if (overflows.length) {
    console.error(`\n✗ Rolagem horizontal em ${overflows.length} captura(s):\n  ${overflows.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
