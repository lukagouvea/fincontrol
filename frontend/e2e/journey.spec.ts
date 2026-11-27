import { expect, test, type Page } from "@playwright/test";
import { closeDetail, deleteAccountViaApi, detailOf, dialog, go, isDesktop, money, newTransaction, openCard, row, typeCents } from "./helpers";

/**
 * Roteiro de uso completo, do jeito que a pessoa usa o app: cria a conta,
 * configura, cadastra o mês e confere que tudo aparece onde deveria.
 * Os passos dependem uns dos outros, então rodam em série numa só página.
 * Roda como Android (360px), iPhone (390px) e desktop (1280px).
 *
 * Regras do roteiro:
 * - navegação só pela interface (go() falha se não houver caminho; nunca digita URL);
 * - cada conferência é na própria linha/cartão (valor, categoria, forma de pagamento),
 *   não "o texto aparece em algum lugar da página";
 * - o que é criado é conferido de novo depois de recarregar (ficou salvo no servidor).
 */
test.describe.configure({ mode: "serial" });

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
let page: Page;
let user: { name: string; email: string; password: string };
let baseURL: string;

const R$ = (amount: string) => new RegExp(`R\\$\\s${amount.replace(/\./g, "\\.")}`);

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
  await page.getByRole("link", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible();
  await page.getByLabel("Nome").fill(user.name);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/configurar$/);
  await expect(page.getByText("Adicione seu primeiro cartão")).toBeVisible();
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
  const checklist = page.getByRole("region", { name: "Comece por aqui" });
  await expect(checklist.getByText("Cartão adicionado")).toBeVisible();
  await expect(checklist.getByText("Roxinho •••• 1234")).toBeVisible();
});

test("cria uma categoria", async () => {
  await go(page, "Categorias", "/categorias");
  await page.getByRole("button", { name: "Nova categoria" }).first().click();
  const sheet = dialog(page, "Nova categoria");
  await sheet.getByLabel("Nome").fill("Pets");
  await sheet.getByRole("button", { name: /^(Criar|Salvar)/ }).click();
  await expect(sheet).toBeHidden();
  await expect(row(page, "Pets")).toBeVisible();
  await page.reload();
  await expect(row(page, "Pets")).toBeVisible();
});

test("lança uma despesa à vista em categoria escolhida na busca", async () => {
  await go(page, "Transações", "/transacoes");
  const sheet = await newTransaction(page);
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "4590");
  await expect(sheet.getByLabel("Valor", { exact: true })).toHaveValue(money("45,90"));
  await sheet.getByRole("button", { name: /^À vista/ }).click();
  await sheet.getByRole("button", { name: /^(Mais|\+ Nova)$/ }).click();
  const picker = page.getByRole("dialog", { name: "Escolher categoria" });
  await picker.getByLabel("Buscar categoria").fill("pet");
  await picker.getByRole("button", { name: "Pets" }).click();
  await expect(sheet.getByRole("button", { name: "Pets" })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByLabel("Descrição").fill("Ração");
  await sheet.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(sheet).toBeHidden();

  for (const reloaded of [false, true]) {
    if (reloaded) await page.reload();
    const racao = row(page, "Ração");
    await expect(racao).toContainText("Pets");
    await expect(racao).toContainText("À vista");
    await expect(racao).toContainText(R$("45,90"));
  }
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
  const geladeira = row(page, "Geladeira");
  await expect(geladeira).toContainText("Parcela 1 de 3");
  await expect(geladeira).toContainText("Roxinho");
  await expect(geladeira).toContainText(R$("400,00"));

  // A 1ª parcela entra na fatura do cartão e ocupa o limite pelo total da compra.
  await go(page, "Cartões", "/cartoes");
  await openCard(page, "Roxinho");
  await expect(row(page, "Geladeira")).toContainText(R$("400,00"));
  // "Limite disponível" na fatura (celular) ou "Disponível" no painel do cartão (desktop).
  await expect(page.getByRole("main")).toContainText(/Disponível\s*R\$\s3\.800,00/i);
});

test("lança uma receita", async () => {
  await go(page, "Transações", "/transacoes");
  const sheet = await newTransaction(page);
  await sheet.getByRole("radio", { name: "Receita" }).click();
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "500000");
  await sheet.getByRole("button", { name: "Salário" }).click();
  await sheet.getByLabel("Descrição").fill("Salário novembro");
  // Teclado aberto (o Playwright não abre o teclado virtual, então marca como o
  // useViewport marcaria): no celular o rodapé some e o "Concluir" (Enter) salva.
  const save = sheet.getByRole("button", { name: "Salvar receita" });
  await page.evaluate(() => (document.documentElement.dataset.keyboard = "open"));
  if (page.viewportSize()!.width < 1024) await expect(save).toBeHidden();
  else await expect(save).toBeVisible();
  await sheet.getByLabel("Descrição").press("Enter");
  await expect(sheet).toBeHidden();
  await page.evaluate(() => delete document.documentElement.dataset.keyboard);
  const salario = row(page, "Salário novembro");
  await expect(salario).toContainText(/\+\s*R\$\s5\.000,00/);
  await expect(salario).toContainText("Salário");
});

test("edita uma transação", async () => {
  await row(page, "Ração").click();
  let detail = await detailOf(page);
  await detail.getByRole("button", { name: /^Editar( transação)?$/ }).click();
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

  detail = await detailOf(page);
  await expect(detail.getByText(money("45,00")).first()).toBeVisible();
  await closeDetail(page);
  await page.reload();
  await expect(row(page, "Ração")).toContainText(R$("45,00"));
});

test("exclui com desfazer e depois exclui de vez", async () => {
  const removeRacao = async () => {
    await row(page, "Ração").click();
    const detail = await detailOf(page);
    await detail.getByRole("button", { name: /^Excluir( transação)?$/ }).click();
    const confirm = page.getByRole("dialog", { name: "Excluir transação?" });
    await confirm.getByRole("button", { name: "Excluir" }).click();
    await expect(confirm).toBeHidden();
  };
  await removeRacao();
  await expect(page.getByText("Ração")).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(row(page, "Ração")).toContainText(R$("45,00"));

  await removeRacao();
  await expect(page.getByText("Ração")).toHaveCount(0);
  // Espera o aviso sumir: só então a exclusão vai para o servidor.
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeHidden({ timeout: 15_000 });
  await page.reload();
  await expect(row(page, "Geladeira")).toBeVisible();
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
  await expect(row(page, "Aluguel")).toContainText(R$("1.500,00"));
  await page.reload();
  await expect(row(page, "Aluguel")).toContainText(R$("1.500,00"));

  // A ocorrência do mês aparece nas transações, À vista e em Moradia.
  await go(page, "Transações", "/transacoes");
  const aluguel = row(page, "Aluguel");
  await expect(aluguel).toContainText("Moradia");
  await expect(aluguel).toContainText("À vista");
  await expect(aluguel).toContainText(R$("1.500,00"));
});

test("passa a recorrente para o cartão e ela entra na fatura", async () => {
  await go(page, "Recorrentes", "/recorrentes");
  await page.getByRole("button", { name: "Editar Aluguel" }).first().click();
  const sheet = dialog(page, "Editar recorrência");
  await sheet.getByLabel("Pago com").selectOption({ label: "Roxinho •••• 1234" });
  // Trocar a forma de pagamento pergunta desde quando vale (padrão: mês que vem).
  // Escolhe o mês atual, para o lançamento deste mês já ir para a fatura.
  const now = new Date();
  const thisMonth = `${now.toLocaleString("pt-BR", { month: "long" })} de ${now.getFullYear()}`;
  await sheet.getByLabel("Mês de início da alteração").selectOption({ label: thisMonth });
  await sheet.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(sheet).toBeHidden();

  await go(page, "Cartões", "/cartoes");
  await openCard(page, "Roxinho");
  await expect(row(page, "Aluguel")).toContainText(R$("1.500,00"));
  await go(page, "Transações", "/transacoes");
  await expect(row(page, "Aluguel")).toContainText("Roxinho");
});

test("cria uma meta e guarda dinheiro nela", async () => {
  await go(page, "Metas", "/metas");
  await page.getByRole("button", { name: "Nova meta" }).first().click();
  const sheet = dialog(page, "Nova meta");
  await sheet.getByLabel("Nome da meta").fill("Viagem");
  await sheet.getByLabel("Quanto você quer juntar").fill("6000");
  await sheet.getByRole("button", { name: /^(Criar|Salvar)/ }).click();
  await expect(sheet).toBeHidden();
  const viagem = row(page, "Viagem");
  await expect(viagem).toContainText("0%");

  await viagem.getByRole("button", { name: "Guardar" }).click();
  const save = dialog(page, "Guardar na meta");
  await save.getByLabel("Valor").fill("600");
  await expect(save.getByText("R$ 600,00 de R$ 6.000,00.")).toBeVisible();
  await save.getByRole("button", { name: "Confirmar aporte" }).click();
  await expect(save).toBeHidden();
  for (const reloaded of [false, true]) {
    if (reloaded) await page.reload();
    await expect(row(page, "Viagem")).toContainText("10%");
    await expect(row(page, "Viagem")).toContainText(R$("600,00"));
  }
});

test("define o limite de uma categoria no orçamento", async () => {
  await go(page, "Orçamento", "/orcamento");
  const desktop = isDesktop(page);
  // Celular: "Definir limites" abre a edição. Desktop: o limite é editado direto na tabela.
  if (!desktop) await page.getByRole("button", { name: "Definir limites" }).click();
  await page.getByLabel("Limite de Pets").fill("200");
  await page.getByRole("button", { name: "Salvar limites" }).click();

  // Limite total = "Geral" do primeiro uso (3.000) + Pets (200). Gasto do mês:
  // 1ª parcela da geladeira (400) + aluguel (1.500), tudo em Moradia.
  for (const reloaded of [false, true]) {
    if (reloaded) await page.reload();
    await expect(page.getByRole("main")).toContainText(/Gasto: R\$\s1\.900,00\s*Limite: R\$\s3\.200,00/);
    if (desktop) {
      await expect(page.getByLabel("Limite de Pets")).toHaveValue(money("200"));
    } else {
      const pets = page.getByRole("listitem").filter({ hasText: "Pets" });
      await expect(pets).toContainText(/R\$\s0,00 de R\$\s200,00/);
      await expect(pets.getByRole("img", { name: "0% usado" })).toBeVisible();
    }
  }
});

test("relatórios mostram receitas e despesas do mês", async () => {
  await go(page, "Relatórios", "/relatorios");
  await expect(page.getByRole("region", { name: "Receitas do mês" })).toContainText(R$("5.000,00"));
  await expect(page.getByRole("region", { name: "Despesas do mês" })).toContainText(R$("1.900,00"));
  await expect(page.getByRole("region", { name: "Saldo do mês" })).toContainText(R$("3.100,00"));
  await expect(page.getByRole("heading", { name: "Despesas por categoria" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Moradia" })).toContainText(R$("1.900,00"));
});

test("parcelada no Pix vira conta a pagar e é marcada como paga", async () => {
  await go(page, "Transações", "/transacoes");
  const sheet = await newTransaction(page);
  await typeCents(sheet.getByLabel("Valor", { exact: true }), "30000");
  await sheet.getByRole("button", { name: /^À vista/ }).click();
  await sheet.getByLabel("Parcelas").selectOption("3");
  await expect(sheet.getByText(/3x de R\$\s100,00/)).toBeVisible();
  await sheet.getByRole("button", { name: "Outros" }).click();
  await sheet.getByLabel("Descrição").fill("Curso");
  await sheet.getByRole("button", { name: "Salvar despesa" }).click();
  await expect(sheet).toBeHidden();
  await expect(row(page, "Curso")).toContainText("A pagar");

  // A 1ª parcela vence hoje: aparece em "Contas a pagar" no Início.
  await go(page, "Início", "/");
  const bills = page.getByRole("region", { name: "Contas a pagar" });
  const curso = bills.getByRole("listitem").filter({ hasText: "Curso" });
  await expect(curso).toContainText("Vence hoje · parcela 1 de 3");
  await expect(curso).toContainText(R$("100,00"));
  await curso.getByRole("button", { name: "Marcar Curso como paga" }).click();
  await expect(page.getByText("Curso marcada como paga")).toBeVisible();
  await expect(bills).toBeHidden();

  // Na lista some o "A pagar"; no detalhe, o pagamento fica registrado com a data (inclusive depois de recarregar).
  await go(page, "Transações", "/transacoes");
  await page.reload();
  await expect(row(page, "Curso")).not.toContainText("A pagar");
  await row(page, "Curso").click();
  const detail = await detailOf(page);
  await expect(detail.getByText(/^Paga em \d+ \w+/)).toBeVisible();
  await expect(detail.getByRole("button", { name: "Desmarcar pagamento" })).toBeVisible();
  await closeDetail(page);
});

test("sai e entra de novo", async () => {
  await go(page, "Ajustes", "/ajustes");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Depois de "Sair da conta", o próximo login começa no Início, com os dados lá.
  await expect(page).toHaveURL(/\/$/);
  await expect(row(page, "Geladeira")).toContainText(R$("400,00"));
});

test("exclui a conta e não consegue mais entrar", async () => {
  // Celular: Ajustes › Segurança e dados. Desktop: as ações ficam no próprio Ajustes.
  if (isDesktop(page)) await go(page, "Ajustes", "/ajustes");
  else await go(page, "Segurança e dados", "/ajustes/dados");
  await page.getByRole("button", { name: /^Excluir minha conta/ }).click();
  const confirm = dialog(page, "Excluir sua conta?");
  await confirm.getByLabel("Sua senha").fill(user.password);
  await confirm.getByRole("button", { name: "Excluir minha conta" }).click();
  await expect(page).toHaveURL(/\/entrar$/);

  await page.getByLabel("E-mail").fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("E-mail ou senha incorretos.");
  await expect(page).toHaveURL(/\/entrar$/);
});
