import { expect, request as playwrightRequest, type Locator, type Page } from "@playwright/test";

/** Valor como o app mostra ("R$ 45,90", "− R$ 45,90", "+ R$ 5"), aceitando o espaço especial do Intl. */
export const money = (amount: string) => new RegExp(`^[-−+]?\\s*R\\$\\s${amount.replace(/\./g, "\\.")}$`);

/** A folha/diálogo aberto (o último, se houver mais de um). */
export const dialog = (page: Page, name?: string) =>
  name ? page.getByRole("dialog", { name }) : page.getByRole("dialog").last();

/**
 * Navega como a pessoa faria: pelo menu (barra lateral no desktop, barra
 * inferior no celular) ou, no celular, por Ajustes quando o item não está
 * na barra inferior. Cai no endereço direto só se não achar o link.
 */
export async function go(page: Page, name: string, path: string) {
  const nav = page.getByRole("navigation").getByRole("link", { name, exact: true });
  if (await nav.first().isVisible().catch(() => false)) {
    await nav.first().click();
  } else {
    const settings = page.getByRole("link", { name: "Ajustes", exact: true }).or(page.getByRole("link", { name: /ajustes/i })).first();
    if (path !== "/ajustes" && (await settings.isVisible().catch(() => false))) {
      await settings.click();
      const item = page.getByRole("link", { name: new RegExp(`^${name}`) }).first();
      if (await item.isVisible().catch(() => false)) await item.click();
      else await page.goto(path);
    } else if (path === "/ajustes" && (await settings.isVisible().catch(() => false))) {
      await settings.click();
    } else {
      await page.goto(path);
    }
  }
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?|$)`));
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
