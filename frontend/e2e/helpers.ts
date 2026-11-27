import { expect, request as playwrightRequest, type Locator, type Page } from "@playwright/test";

/** Valor como o app mostra ("R$ 45,90", "− R$ 45,90", "+ R$ 5"), aceitando o espaço especial do Intl. */
export const money = (amount: string) => new RegExp(`^[-−+]?\\s*R\\$\\s${amount.replace(/\./g, "\\.")}$`);

/** A folha/diálogo aberto (o último, se houver mais de um). */
export const dialog = (page: Page, name?: string) =>
  name ? page.getByRole("dialog", { name }) : page.getByRole("dialog").last();

export const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/** Itens que, no celular, só existem dentro de Ajustes (engrenagem no Início). */
const SETTINGS_ITEMS = ["Categorias", "Recorrentes", "Metas", "Alertas", "Atalhos", "Aparência", "Segurança e dados"];

/** Espera a tela de destino de fato: a URL muda antes de a tela nova aparecer. */
async function waitForScreen(page: Page, name: string, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?|$)`));
  // Enquanto o código da rota carrega, o React mantém a tela anterior visível
  // (no CI, um clique logo depois caía na tela antiga).
  const ready =
    path === "/"
      ? page.getByText(/^Gasto em /).filter({ visible: true }).first()
      : page.getByRole("heading", { level: 1, name, exact: true });
  await expect(ready).toBeVisible();
}

/**
 * Navega só pela interface, como a pessoa faria, e falha se não houver caminho
 * (nunca digita a URL: isso escondia caminhos quebrados).
 * - Item no menu principal (barra lateral no desktop, barra inferior no celular): clica.
 * - Celular, item de Ajustes: Início › engrenagem (Ajustes) › item.
 * - Desktop, Ajustes: link na barra lateral.
 */
export async function go(page: Page, name: string, path: string) {
  const inNav = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name, exact: true }).filter({ visible: true });
  if (await inNav.count()) {
    await inNav.first().click();
    return waitForScreen(page, name, path);
  }
  if (name !== "Ajustes" && !SETTINGS_ITEMS.includes(name)) throw new Error(`Sem caminho na interface para "${name}" (${path}).`);

  // Ajustes: link na barra lateral (desktop) ou engrenagem do Início (celular).
  const settingsLink = page.getByRole("link", { name: "Ajustes", exact: true }).filter({ visible: true });
  if (!(await settingsLink.count())) await go(page, "Início", "/");
  await settingsLink.first().click();
  await waitForScreen(page, "Ajustes", "/ajustes");
  if (name === "Ajustes") return;

  const item = page.getByRole("link", { name: new RegExp(`^${name}`) }).filter({ visible: true });
  await expect(item, `"${name}" deveria estar em Ajustes`).toHaveCount(1);
  await item.click();
  await waitForScreen(page, name, path);
}

/**
 * Linha visível de lista ou tabela que contém `text` (ex.: a transação na lista),
 * para conferir valor, categoria etc. na própria linha, não em qualquer lugar da página.
 */
export const row = (page: Page, text: string | RegExp) =>
  page.getByRole("listitem").or(page.getByRole("row")).filter({ hasText: text }).filter({ visible: true }).first();

/**
 * Abre o cartão como a pessoa faria: no celular, toca no cartão (vai para a
 * fatura); no desktop, escolhe o cartão na lista (abre o painel ao lado).
 */
export async function openCard(page: Page, name: string) {
  if (isDesktop(page)) {
    const option = page.getByRole("listbox", { name: "Seus cartões" }).getByRole("option").filter({ hasText: name });
    await option.click();
    await expect(option).toHaveAttribute("aria-selected", "true");
  } else {
    await page.getByLabel("Seus cartões").getByRole("link").filter({ hasText: name }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Fatura ${name}` })).toBeVisible();
  }
}

/**
 * Detalhe da transação aberto: folha "Detalhes" no celular; no desktop, o painel
 * ao lado da lista (a página inteira, já que o painel não tem nome próprio).
 */
export async function detailOf(page: Page) {
  if (isDesktop(page)) return page.getByRole("main");
  const sheet = dialog(page, "Detalhes");
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Fecha o detalhe no celular (no desktop o painel fica). */
export async function closeDetail(page: Page) {
  if (isDesktop(page)) return;
  const sheet = dialog(page, "Detalhes");
  await sheet.getByRole("button", { name: "Fechar" }).click();
  await expect(sheet).toBeHidden();
}

/** Abre "Nova transação" pelo botão que estiver na tela (topo, "+" flutuante ou cabeçalho). */
export async function newTransaction(page: Page) {
  await page.getByRole("button", { name: "Nova transação" }).first().click();
  const sheet = dialog(page, "Nova transação");
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Digita no campo de valor em modo centavos, tecla por tecla, como no celular. */
export async function typeCents(input: Locator, digits: string) {
  await input.click();
  await input.pressSequentially(digits);
}

/**
 * Limpeza garantida: entra pela API e exclui a conta de teste. Usada no fim
 * do roteiro (se um passo falhou antes de "excluir conta") e não falha se a
 * conta já não existir.
 */
export async function deleteAccountViaApi(baseURL: string, email: string, password: string) {
  const api = await playwrightRequest.newContext({ baseURL });
  try {
    const login = await api.post("/api/auth/login", { data: { email, password } });
    if (!login.ok()) return false;
    const removed = await api.delete("/api/me", { data: { password } });
    return removed.ok();
  } finally {
    await api.dispose();
  }
}
