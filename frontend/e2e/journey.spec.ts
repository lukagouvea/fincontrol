import { expect, test, type Page } from "@playwright/test";
import { deleteAccountViaApi, dialog, go, money, newTransaction, typeCents } from "./helpers";

/**
 * Roteiro de uso completo, do jeito que a pessoa usa o app: cria a conta,
 * configura, cadastra o mês e confere que tudo aparece onde deveria.
 * Os passos dependem uns dos outros, então rodam em série numa só página.
 * Roda como celular Android (360px) e como desktop (1280px).
 */
test.describe.configure({ mode: "serial" });

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
let page: Page;
let user: { name: string; email: string; password: string };
let baseURL: string;

test.beforeAll(async ({ browser }, info) => {
  user = { name: "Teste E2E", email: `e2e-${info.project.name}-${stamp}@local.test`, password: "senha-e2e-123" };
  baseURL = String(info.project.use.baseURL);
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page?.close();
  // Se algum passo falhou antes de "exclui a conta", não deixa a conta no banco.
  await deleteAccountViaApi(baseURL, user.email, user.password);
});

test("cria a conta pelas boas-vindas", async () => {
  await page.goto("/boas-vindas");
  await expect(page.getByText("Seu dinheiro, sem planilha")).toBeVisible();
  await page.getByRole("link", { name: /criar conta|começar/i }).first().click();
  await expect(page).toHaveURL(/\/criar-conta/);
  await page.getByLabel("Nome").fill(user.name);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /criar conta/i }).click();
  await expect(page).toHaveURL(/\/configurar/);
});

test("configura o primeiro cartão e o orçamento", async () => {
  await page.getByLabel("Apelido do cartão").fill("Roxinho");
  await page.getByLabel("Final").fill("1234");
  await page.getByLabel("Limite").fill("5000");
  await page.getByLabel("Fecha no dia").fill("5");
  await page.getByLabel("Vence no dia").fill("12");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByText("Quanto quer gastar por mês?")).toBeVisible();
  await page.getByLabel("Orçamento mensal").fill("3000");
  await page.getByRole("button", { name: "Começar" }).click();

  await expect(page).toHaveURL(/\/$/);
  const checklist = page.getByLabel("Comece por aqui");
  await expect(checklist).toBeVisible();
  await expect(checklist.getByText("Cartão adicionado")).toBeVisible();
});

test("cria uma categoria", async () => {
  await go(page, "Categorias", "/categorias");
  await page.getByRole("button", { name: /nova categoria/i }).first().click();
  const sheet = dialog(page);
  await sheet.getByLabel("Nome").fill("Pets");
  await sheet.getByRole("button", { name: /criar|salvar/i }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Pets").first()).toBeVisible();
});

test("lança uma despesa à vista em categoria escolhida na busca", async () => {
  await go(page, "Transações", "/transacoes");
  const sheet = await newTransaction(page);
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "4590");
  await expect(sheet.getByLabel("Valor", { exact: true })).toHaveValue(money("45,90"));
  await sheet.getByRole("button", { name: /^(Mais|\+ Nova)$/ }).click();
  const picker = page.getByRole("dialog", { name: "Escolher categoria" });
  await picker.getByLabel("Buscar categoria").fill("pet");
  await picker.getByRole("button", { name: "Pets" }).click();
  await sheet.getByLabel("Descrição").fill("Ração");
  await sheet.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Ração").first()).toBeVisible();
});

test("lança uma compra parcelada no cartão", async () => {
  const sheet = await newTransaction(page);
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "120000");
  await sheet.getByRole("button", { name: /Roxinho/ }).click();
  await sheet.getByLabel("Parcelas").selectOption("3");
  await expect(sheet.getByText(/3x de R\$\s400,00/)).toBeVisible();
  await sheet.getByRole("button", { name: "Moradia" }).click();
  await sheet.getByLabel("Descrição").fill("Geladeira");
  await sheet.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Geladeira").first()).toBeVisible();
});

test("lança uma receita", async () => {
  const sheet = await newTransaction(page);
  await sheet.getByRole("radio", { name: "Receita" }).click();
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "500000");
  await sheet.getByRole("button", { name: "Salário" }).click();
  await sheet.getByLabel("Descrição").fill("Salário novembro");
  await sheet.getByRole("button", { name: "Salvar receita" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Salário novembro").first()).toBeVisible();
});

test("edita uma transação", async () => {
  await page.getByText("Ração").first().click();
  await page.getByRole("button", { name: "Editar" }).click();
  const sheet = dialog(page, "Editar despesa");
  // A categoria salva continua marcada (regressão: era trocada pela primeira da lista).
  await expect(sheet.getByRole("button", { name: "Pets" })).toHaveAttribute("aria-pressed", "true");
  const amount = sheet.getByLabel("Valor", { exact: true });
  await expect(amount).toHaveValue(money("45,90"));
  await amount.click();
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("00");
  await expect(amount).toHaveValue(money("45,00"));
  await sheet.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(sheet).toBeHidden();
  // Volta ao detalhe já com o valor novo (folha no celular, painel lateral no desktop).
  await expect(page.getByText(money("45,00")).first()).toBeVisible();
  const detail = dialog(page, "Detalhes");
  if (await detail.isVisible()) await detail.getByRole("button", { name: "Fechar" }).click();
});

test("exclui com desfazer e depois exclui de vez", async () => {
  const removeRacao = async () => {
    await page.getByText("Ração").first().click();
    await page.getByRole("button", { name: "Excluir" }).first().click();
    const confirm = page.getByRole("dialog").filter({ hasText: /excluir/i }).last();
    await confirm.getByRole("button", { name: /excluir/i }).last().click();
  };
  await removeRacao();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Ração").first()).toBeVisible();

  await removeRacao();
  await expect(page.getByText("Ração")).toHaveCount(0);
  // Espera o toast sumir: só então a exclusão vai para o servidor.
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeHidden({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByText("Geladeira").first()).toBeVisible();
  await expect(page.getByText("Ração")).toHaveCount(0);
});

test("cadastra uma conta recorrente", async () => {
  await go(page, "Recorrentes", "/recorrentes");
  await page.getByRole("button", { name: "Nova recorrência" }).first().click();
  const sheet = dialog(page, "Nova recorrência");
  await sheet.getByLabel("Nome").fill("Aluguel");
  await sheet.getByLabel("Valor").fill("1500");
  await expect(sheet.getByLabel("Valor")).toHaveValue(money("1.500"));
  // "Todo dia" vem com o dia de hoje e "Começa em" com hoje: cai neste mês.
  // (Um dia já passado só começaria no mês que vem.)
  await sheet.getByLabel("Categoria").selectOption({ label: "Moradia" });
  await sheet.getByRole("button", { name: "Criar recorrência" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Aluguel").first()).toBeVisible();
  // A recorrente aparece nas transações do mês, marcada como recorrente.
  await go(page, "Transações", "/transacoes");
  await expect(page.getByText("Aluguel").first()).toBeVisible();
});

test("cria uma meta e guarda dinheiro nela", async () => {
  await go(page, "Metas", "/metas");
  await page.getByRole("button", { name: /nova meta/i }).first().click();
  const sheet = dialog(page);
  await sheet.getByLabel("Nome da meta").fill("Viagem");
  await sheet.getByLabel("Quanto você quer juntar").fill("6000");
  await sheet.getByRole("button", { name: /criar|salvar/i }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText("Viagem").first()).toBeVisible();

  await page.getByRole("button", { name: /guardar/i }).first().click();
  const save = dialog(page, "Guardar na meta");
  await save.getByLabel("Valor").fill("600");
  await expect(save.getByText("R$ 600,00 de R$ 6.000,00.")).toBeVisible();
  await save.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(save).toBeHidden();
  await expect(page.getByText("10%").first()).toBeVisible();
});

test("define o limite de uma categoria no orçamento", async () => {
  await go(page, "Orçamento", "/orcamento");
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  // Celular: "Definir limites" abre a edição. Desktop: o limite é editado direto na tabela.
  if (!desktop) await page.getByRole("button", { name: "Definir limites" }).click();
  await page.getByLabel("Limite de Pets").fill("200");
  await page.getByRole("button", { name: /salvar limites/i }).click();

  // Limite total = "Geral" do primeiro uso (3.000) + Pets (200). Gasto do mês:
  // 1ª parcela da geladeira (400) + aluguel (1.500), tudo em Moradia.
  await expect(page.getByRole("main")).toContainText(/Gasto: R\$\s1\.900,00\s*Limite: R\$\s3\.200,00/);
  if (desktop) {
    await page.reload();
    await expect(page.getByLabel("Limite de Pets")).toHaveValue(money("200"));
  } else {
    const pets = page.getByRole("listitem").filter({ hasText: "Pets" });
    await expect(pets).toContainText(/R\$\s0,00 de R\$\s200,00/);
    await expect(pets.getByRole("img", { name: "0% usado" })).toBeVisible();
  }
});

test("relatórios mostram receitas e despesas do mês", async () => {
  await go(page, "Relatórios", "/relatorios");
  await expect(page.getByText(money("5.000,00")).first()).toBeVisible();
  await expect(page.getByText(money("1.900,00")).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Despesas por categoria" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Moradia" })).toContainText(/R\$\s1\.900,00/);
});

test("sai e entra de novo", async () => {
  await go(page, "Ajustes", "/ajustes");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/(entrar|boas-vindas)/);
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  // Depois de "Sair da conta", o próximo login começa no Início, com os dados lá.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Geladeira").first()).toBeVisible();
});

test("exclui a conta e não consegue mais entrar", async () => {
  await go(page, "Segurança e dados", "/ajustes/dados");
  await page.getByRole("button", { name: /^Excluir minha conta/ }).click();
  const confirm = dialog(page, "Excluir sua conta?");
  await confirm.getByLabel("Sua senha").fill(user.password);
  await confirm.getByRole("button", { name: "Excluir minha conta" }).click();
  await expect(page).toHaveURL(/\/(entrar|boas-vindas)/);

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar/);
});
