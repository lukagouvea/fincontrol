# GAP — design novo × FinControl atual

Branch: `feat/redesign`. Referência: `design/DESIGN.md`, `design/PRODUCT_RULES.md`, `design/SCREENS.md`.

Legenda de status:
- **R**: a tela existe e só precisa do visual novo.
- **F**: existe, mas faltam funcionalidades.
- **N**: é nova e não exige schema.
- **S**: exige mudança de schema/API.

Fase = fase do plano em que a tela entra (ver final do documento).

## 1. Telas

### Início e transações
| Tela (mobile / desktop) | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Início `Main` / `DeskInicio` | F | `pages/Dashboard.tsx` + `components/Dashboard/*` | 2 → 3c | Layout fixo; os módulos dnd saem. "Esta semana" e "Faturas abertas" dependem de 3a/3c. |
| Transações `Transacoes` / `DeskTransacoes` | F | `pages/Transactions.tsx`, `Shared/{Fixed,Variable}Transactions.tsx` | 2 | Lista única: variáveis + recorrentes projetadas + parcelas. Tabela no desktop. Chip de pagamento em 3a. |
| Nova transação `Nova`, `NovaAVista`, `NovaReceita` / `DeskNova` | F | `Shared/TransactionForm.tsx`, `Layout/QuickAdd.tsx` | 2 → 3a | O campo "Pago com" depende de 3a. **Divergência (pedido do dono):** no desktop o formulário segue o layout do celular (categorias em blocos com ícone, grade de 3, "Repetir todo mês" em cartão), não os chips de texto do `DeskNova`. Do desktop ficam só o diálogo, o "Cancelar" e o "Pago com" quebrando linha. |
| Detalhe `Detalhe` / painel em `DeskTransacoes` | N | — | 2 | Hoje a edição abre direto no modal. |
| Parcelar `Parcelar`, `NovaParcelada` / `DeskParcelar` | F | `TransactionForm` (modo parcelado) | 2 → 3a | Precisa do cartão. |
| Excluir + desfazer `ExcluirTransacao`, `TransacoesDesfazer` / `DeskExcluir`, `DeskDesfazer` | N | `ConfirmationModal.tsx` | 2 | O desfazer usa commit adiado no cliente. |
| Filtros `Filtros`, `TransacoesFiltrada` / `DeskFiltros` | N | — | 3g | Filtro por pagamento depende de 3a. |
| Lote `TransacoesSelecao`, `LoteCategoria`, `LoteExcluir` / `DeskSelecao`, `DeskLoteCategoria`, `DeskLoteExcluir` | S | — | 3g | `POST /transactions/batch`. |

### Cartões, faturas e compromissos
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Cartões `Cartoes` / `DeskCartoes` | S | — | 3a | Modelo `Card`. |
| Novo cartão `NovoCartao` / `DeskNovoCartao` | S | — | 3a | |
| Fatura `Fatura` | S | — | 3a | Fatura derivada da data de fechamento. |
| Pagar fatura `PagarFatura`, `FaturaPaga` / `DeskPagarFatura`, `DeskFaturaPaga` | S | — | 3a | `InvoicePayment`; não é gasto. |
| Compromissos `Compromissos` / `DeskCompromissos` | F | `useComprasParceladas` | 3a | Soma parcelas futuras + fixas. |
| Compra parcelada `ParcelaDetalhe` / `DeskParcelaDetalhe` | F | — | 3a | |

### Recorrentes
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Recorrentes `Recorrentes` / `DeskRecorrentes` | R | `pages/{Income,Expenses}/Fixed*.tsx` | 2 | Receitas e despesas fixas numa lista só. |
| Editar `EditarRecorrencia` / `DeskEditarRecorrencia` | R | `TransactionForm` + `FixedUpdateScope` | 2 | O versionamento `from/all` já existe. |
| Pausar/encerrar `EncerrarRecorrencia` / `DeskEncerrarRecorrencia` | S | `DELETE /recurring/:id` | 2 (encerrar) → 3c (pausar) | Pausar exige `pausedFrom/pausedUntil`. |

### Orçamento e metas
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Orçamento `Orcamento` / `DeskOrcamento` | S | `Dashboard/MonthlyManagementCard.tsx` (cálculo no cliente) | 3c | `BudgetVersion` e `CategoryLimitVersion`. |
| Definir limites `DefinirOrcamento` | S | — | 3c | |
| Metas `Metas` / `DeskMetas` | S | — | 3d | `Goal` e `GoalContribution`. |
| Nova meta / Guardar `NovaMeta`, `GuardarMeta` / `DeskNovaMeta` | S | — | 3d | |

### Categorias
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Categorias `Categorias` / `DeskCategorias` | R | `pages/Categories.tsx` | 2 → 3b | Ícone em 3b; sai o seletor de 20 cores. |
| Escolher categoria `MaisCategorias` | N | — | 2 | Folha usada pelo formulário. |
| Nova categoria `NovaCategoria` / `DeskNovaCategoria` | F | `pages/Categories.tsx` | 2 → 3b | |
| Apagar categoria `ApagarCategoria` / `DeskApagarCategoria` | S | `DELETE /categories/:id` | 3b | Pede o destino das transações; mesclar. |

### Relatórios, histórico e virada
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Relatórios `Relatorios` / `DeskRelatorios` | F | `pages/Reports.tsx`, `History/*`, `utils/reportData.ts` | 2 → 3c | Burndown e "semana a semana" em 3c; "por forma de pagamento" em 3a. |
| Histórico `Historico` / `DeskHistorico` | S | — | 3f | `MonthSummary`. |
| Fechamento `Fechamento` / `DeskFechamento` | S | — | 3f | |
| Virada `ViradaMes` / `DeskVirada` | S | — | 3f | |

### Importar e atalhos
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Importar `Importar`, `ImportarRevisar`, `ImportarOk` / `DeskImportar` | S | — | 3h | `ImportBatch`; parse no cliente. |
| Atalhos `Atalhos` | N | `vite.config.ts` (manifest) | 4 | Sem widget, só `shortcuts`. |
| Gasto rápido `Rapido` | N | — | 4 | |

### Primeiro uso e estados vazios
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Entrar / Criar conta `Entrar`, `CriarConta` / `DeskEntrar`, `DeskCriarConta` | R | `pages/Auth/*`, `Auth/AuthShell.tsx` | 2 | |
| Boas-vindas `Boasvindas` | N | — | 3e | |
| Recuperar senha `RecuperarSenha` / `DeskRecuperarSenha` | S | — | adiada | Não há envio de e-mail; o link fica oculto. |
| Setup `SetupCartao`, `SetupOrcamento` / `DeskSetup` | S | `useTutorial.tsx` (driver.js) | 3e | Depende de 3a e 3c. O driver.js sai. |
| Vazios `InicioVazio`, `TransacoesVazio`, `CartoesVazio` / `DeskInicioVazio`, `DeskTransacoesVazio` | N | `Shared/UI.tsx` `EmptyState` | 2 / 3a / 3e | |

### Ajustes e alertas
| Tela | Status | Arquivo atual | Fase | Observação |
|---|---|---|---|---|
| Ajustes `Config` / `DeskConfig` | F | `Layout/UserMenu.tsx` | 2 | |
| Aparência `Aparencia` | F | `context/ThemeContext.tsx` | 1 | Ganha a opção "Automático". |
| Alertas `Alertas`, `ConfigAlertas` / `DeskAlertas` | S | — | 3i | `AlertPreference` e `AlertDismissal`. |
| Segurança e dados `Dados` | S | — | 3i | Exportar CSV, apagar dados, excluir conta. |

### Sai do app (fora do design; decidido com o dono)
- Calendário: `pages/Calendar.tsx`, `Dashboard/WeeklyFinancialCalendar.tsx`.
- Módulos reordenáveis do Início: `@dnd-kit`, `utils/dashboardLayout.ts`.
- Investimento mensal: as rotas `/investment`, `investmentService`, `useInvestmentSettings` e as tabelas `investment_*`, removidas na migração da fase 3i.
- Tutorial driver.js: substituído pelo checklist "Comece por aqui" na fase 3e.

## 2. Divergências com `PRODUCT_RULES.md` e decisões

| Tema | Hoje | Decisão |
|---|---|---|
| Dinheiro em centavos | `Decimal(12,2)` | Manter `Decimal`, que já é exato. No front, toda conta passa por `lib/money.ts`. |
| Sem contas/saldo | Não há contas; "saldo" = receitas − despesas | Já está alinhado. |
| Forma de pagamento | Não existe | `Card` e `Transaction.cardId?` (`null` = À vista). O legado vira À vista. |
| Fatura | Não existe | Derivada. Pagar = `InvoicePayment`. |
| Parcelas | Grupo + N transações mensais | Mantido, mais `cardId`. Cada parcela conta no mês da sua fatura. |
| Recorrentes | Projetadas no cliente, versionadas | Mantidas projetadas. Pausar ganha campos novos. |
| Categorias | `color`, sem ícone | `icon`; cor vinda da paleta; mesclar; apagar com destino. |
| Orçamento | Cálculo no cliente com investimento | Versões de orçamento total e por categoria. Variável = total − fixas de despesa. |
| Limite da semana | — | Calculado na segunda: (variável restante ÷ dias restantes do mês) × dias da semana dentro do mês. Fixo até domingo. |
| Histórico/virada | — | `MonthSummary` criado de forma lazy, sem cron. |
| Excluir com desfazer | Delete físico | Commit adiado no cliente (cerca de 6 s, com flush no `pagehide`). |
| Agente de IA | **Não existe no código** | Fora do escopo. Fica reservado um slot de insight no Início e nos Alertas. |
| Login | E-mail + senha, cookie JWT | Igual. Recuperar senha fica adiado. |

## 3. Schema e API, em ordem de dependência
1. `Card`, `Transaction.cardId`, `RecurringRule.cardId`, `InvoicePayment`. Rotas `/cards` e `/invoices`. Lib `invoice.ts`.
2. `Category.icon`. Rotas `POST /categories/:id/merge` e `DELETE /categories/:id?moveTo=`.
3. `BudgetVersion`, `CategoryLimitVersion`, `RecurringRule.pausedFrom/pausedUntil`. Rota `/budgets`. Lib `budget.ts`.
4. `Goal`, `GoalContribution`. Rota `/goals`.
5. `User.onboardingCompletedAt`, que substitui `tutorialCompleted`.
6. `MonthSummary`. Rota `/months`.
7. Rota `POST /transactions/batch`.
8. `ImportBatch` e `Transaction.importBatchId`. Rota `/imports`.
9. `AlertPreference` e `AlertDismissal`. Rotas `/alerts` e `/me/export`. `DELETE /me` exclui a conta. Drop de `investment_*`.

## 4. Fases
0. Diagnóstico: este arquivo, `CLAUDE.md` e o script de capturas.
1. Fundação: tokens, fontes, tema, AppShell, componentes base e rotas.
2. Restyle do que já existe, sem schema.
3. Funcionalidades: a cartões/fatura · b categorias+ · c orçamento/semana/burndown · d metas · e primeiro uso · f histórico/virada · g filtros/lote · h importar · i alertas/dados.
4. PWA: atalhos, gasto rápido e fila offline.

## 5. Andamento

### Fase 2 — concluída (branch `feat/redesign`)
Telas refeitas sem mudança de schema: Início, Transações (lista, detalhe, nova/editar, excluir com desfazer), Recorrentes, Categorias, Relatórios, Entrar/Criar conta e Ajustes (com Aparência). Saíram Calendário, os módulos reordenáveis do Início, o investimento mensal (só no frontend), o tutorial driver.js e o `system.css` legado.

Pontos que ficaram para as próximas fases ou que divergem do design:
- **Categorias arquivadas somem do histórico:** `GET /categories` só devolve as ativas, então lançamentos de uma categoria arquivada aparecem como "Sem categoria". Já era assim antes. Correção prevista na fase 3b: a API passa a devolver as arquivadas com `active=false`.
- **Senha mínima de 6 caracteres:** o design pede 8, mas o backend valida 6. Mantido 6 para não travar quem já tem conta; aumentar é decisão do dono.
- **Termos de uso:** a caixa de aceite do Criar conta não foi incluída, porque não há página de termos ou de política.
- **Confirmar senha:** o campo saiu, como no design; no lugar há o botão "Mostrar senha".
- **Toast no escuro:** o "Desfazer" usa o verde-escuro, já que o verde-claro da referência não tinha contraste.
- **Ícone da categoria:** por enquanto é deduzido do nome. Na fase 3b vira o padrão para categorias sem ícone salvo.
- **Início sem orçamento:** o cartão "Restam do orçamento" virou "Sobrou"/"A pagar no mês" até a fase 3c, e "Faturas abertas" depende da 3a.

### Fase 3a: cartões e fatura (concluída)
- **Modelo:** `cards` guarda só os 4 últimos dígitos, com CHECKs no banco. `invoice_payments` registra os pagamentos de fatura. `card_id` é opcional em transações, compras parceladas e recorrentes, e o legado fica como À vista. Remover um cartão que tem histórico só o arquiva.
- **Fatura calculada no cliente** (`frontend/src/features/invoice.ts`), não no backend como previa o plano. Motivo: as recorrentes são projetadas no cliente, e a fatura precisa incluí-las. O backend fornece `/transactions/by-card/:id` e os pagamentos.
- **Regra nova:** faturas que venceram antes do cadastro do cartão contam como pagas. Sem isso, compras antigas lançadas num cartão novo (por exemplo, parcelas em andamento) ficariam "vencidas" para sempre.
- **Limite usado** = tudo que ainda não foi pago, incluindo faturas futuras de parcelas. Segue o PRODUCT_RULES ("o limite cai pelo valor total na compra"); os números do protótipo ignoravam as parcelas futuras.
- **Parcelas no gasto do mês:** cada parcela conta pela própria data (uma por mês a partir da compra), o que na prática coincide com o mês da fatura. A data das parcelas não transborda mais (31/jan + 1 mês = 28/fev).
- **Pagar fatura** não cria transação, e o pagamento pode ser desfeito.
- **Segurança (já existia, corrigido na 3b):** as rotas não conferiam se o `categoryId` enviado pertence ao usuário.

### Fase 3b: categorias (concluída)
- **Ícone:** fica salvo em `categories.icon`. Quando é nulo, o cliente deduz pelo nome. Ao criar uma categoria, o ícone acompanha o nome digitado até o usuário escolher outro.
- **Arquivadas no histórico:** `GET /categories?all=1` devolve também as arquivadas. Os lançamentos antigos mantêm o nome da categoria (antes apareciam como "Sem categoria"), e as telas de escolha mostram só as ativas. A seção "Arquivadas (N)" permite restaurar.
- **Apagar:** pede uma de duas opções. Mesclar em outra (recomendado) move lançamentos, recorrências e versões e depois arquiva. Arquivar só arquiva. As duas têm desfazer, porque a chamada à API só acontece quando o aviso some.
- **Sem categoria "Outros" fixa:** diverge do design, que tem uma "Outros" fixa. Não criei categorias automaticamente; se existir uma chamada "Outros", ela é o destino padrão da mescla.
- **Dono e tipo da categoria:** transações e recorrentes recusam categoria de outro usuário ou do tipo errado.
- **Limite por categoria:** o campo "Limite mensal" da Nova categoria fica para a fase 3c (orçamento).

### Fase 3c: orçamento, limite da semana e pausa (concluída)
- **Orçamento = soma dos limites por categoria**, como em DefinirOrcamento.html ("Soma dos limites abaixo"). Não há um "total" separado, então o plano de `BudgetVersion` + `CategoryLimitVersion` virou uma tabela única, `budget_limits`.
  - Um limite vale no seu mês.
  - Com "Repetir nos próximos meses", vale também nos meses seguintes, até o próximo limite repetido.
  - Limite vazio = sem limite.
- **Orçamento variável** = orçamento − recorrentes fixas de despesa do mês. As parcelas contam no variável.
- **Limite da semana:** fórmula escolhida pelo dono. Na segunda-feira, a semana recebe (variável que resta ÷ dias restantes do mês) × os dias dela que caem no mês. O valor fica fixo até domingo. Semanas que cruzam a virada do mês são cortadas no último dia do mês. Avisa aos 80% e quando passa do limite.
- **Burndown do mês e da semana:** linhas real, ideal e "se mantiver o ritmo". "Semana a semana" compara o gasto variável com o limite de cada semana.
- **Pausar recorrência:** pausa um mês, o do próximo lançamento, que não é gerado nesse mês. Tem "Retomar" e "Desfazer". As pausadas aparecem em "Pausadas em <mês>".
- **Pendente para a fase 3i (alertas):** o "Avisar ao chegar em 80%" de DefinirOrcamento. Por enquanto o aviso aparece só no card da semana.

### Fase 3d: metas (concluída)
- O "já guardado" é a soma das contribuições. "Guardar" grava um valor positivo e "Retirar" um negativo, e não dá para retirar mais do que está guardado. Os dois têm "Desfazer".
- A contribuição tem um `sourceMonth` opcional, já pronto para o "guardar a sobra" do Fechamento do mês (fase 3f).
- **"Para chegar lá":** a sugestão de aporte divide o que falta em parcelas iguais, do mês que vem até o prazo. O valor é arredondado para cima no centavo (R$ 1.428,58 em vez de R$ 1.428,57), para que a soma das parcelas alcance a meta.
- **Sem ícone por meta:** o design não mostra ícone, então a meta não tem esse campo.
- **Pendente para a fase 3i (alertas):** o "Lembrar de guardar todo mês".
- **Onde aparecem:** a tela Metas pode ser aberta pelo Início (atalho no mobile, cartão no desktop) e por Ajustes.

### Fase 3e: primeiro uso (concluída)
- **Fluxo:** quem abre o app sem sessão vê as boas-vindas. Depois vem criar conta e a configuração inicial em dois passos, primeiro cartão e orçamento mensal, ambos puláveis. No fim, o Início mostra o checklist "Comece por aqui".
- **Contas existentes** são marcadas como já configuradas na migração (`onboarding_completed_at`) e não veem o fluxo.
- **Categorias padrão (decisão, não está no design):** uma conta nova não tinha nenhuma categoria e o formulário de transação exige uma. Ao concluir a configuração, se não houver categorias, são criadas as despesas Moradia, Alimentação, Transporte, Lazer, Saúde, Assinaturas e Outros, e as receitas Salário e Extras, já com ícones.
- **Limite "Geral" (decisão):** o passo 2 pede um orçamento total, que o usuário divide por categoria depois, mas no nosso modelo o total é a soma dos limites. O valor informado vira um limite sem categoria, "Geral", que entra na soma e cobre os gastos das categorias sem limite próprio. Em Orçamento, ele aparece como a linha "Geral", que pode ser reduzida conforme o orçamento é dividido.
- **Checklist:** some quando os quatro itens estão feitos, 30 dias depois da configuração ou ao tocar em "Dispensar".
- **Pendente:** a coluna `tutorial_completed` e a rota `/users/tutorial-status` saem na limpeza da fase 3i, junto com o investimento.

### Fase 3f: histórico e virada de mês (concluída)
- **Resumo calculado na hora, sem snapshot (decisão):** o plano previa uma tabela `MonthSummary`. Como todo mês pode ser calculado a partir dos dados, o resumo é derivado na hora e sempre reflete edições em meses passados. No banco fica só `users.last_closing_seen`, o último mês cuja virada já foi vista, para o aviso aparecer uma vez em qualquer aparelho.
- **"Sobrou/Passou":** com orçamento, é orçamento − gasto, como no design (R$ 4.150 − R$ 3.940 = R$ 210). Sem orçamento no mês, é entradas − gastos, e o texto avisa.
- **Histórico:** gasto por mês com a linha do orçamento, média dos meses fechados, quantos meses ficaram dentro do orçamento, melhor e pior mês, e a lista mês a mês em 6 ou 12 meses.
- **Fechamento:** sobra, entradas, faturas pagas no mês (pela data do pagamento), maior gasto e as categorias com limite. "Guardar a sobra numa meta" registra o aporte com o mês de origem (`sourceMonth`), e o que já foi guardado do mês sai da sugestão.
- **Virada:** aparece no Início na primeira visita depois que o mês fecha. Não aparece para contas criadas no mês corrente nem quando o mês anterior não teve lançamentos. Mostra o resultado e o que o mês novo já traz: orçamento repetido, recorrentes, parcelas e limite da semana. O orçamento e as recorrentes já "nascem" no mês novo porque são derivados, sem tarefa agendada.
- **Pendente para a fase 3i:** o "Exportar CSV" do Histórico desktop, junto com "Segurança e dados".

### Fase 3g: filtros e seleção em lote (concluída)
- **Filtros:** período (este mês, mês passado, 3 meses ou datas escolhidas, com até 12 meses), forma de pagamento, categoria e faixa de valor. Vale tudo relativo ao mês selecionado. Os filtros aplicados viram chips removíveis, com contagem e total do resultado, e o botão da folha mostra quantos resultados o rascunho daria. No desktop, os filtros abrem em painel lateral.
- **Lote:** só transações gravadas podem ser selecionadas. As recorrentes projetadas aparecem desabilitadas e se editam pela recorrência.
  - **Mudar categoria:** exige uma seleção só de despesas ou só de receitas.
  - **Mudar pagamento:** só para despesas, e compras parceladas mudam por inteiro.
  - **Excluir:** pede confirmação, e uma parcela exclui a compra inteira.
  - **Desfazer:** mudanças voltam cada transação ao valor anterior. Exclusões só chamam a API quando o aviso some.
- **Backend:** `POST /transactions/batch` é tudo ou nada, até 500 por vez.

### Fase 3h: importar extrato (concluída)
- **Leitura no navegador** (`features/import/parse.ts`). O arquivo não sai do aparelho.
  - OFX nos formatos SGML (sem tags de fechamento) e XML.
  - CSV com detecção de separador, de cabeçalho (inclusive com linhas antes dele), de colunas de crédito e débito separadas e de arquivo sem cabeçalho, deduzido pelo conteúdo.
  - Números no formato brasileiro e internacional e sufixos D/C.
  - Linhas de saldo são descartadas.
  - Se o arquivo não for UTF-8, usa Windows-1252. Limite de 5 MB.
- **Não calibrado com extratos reais:** o dono não tinha arquivos de exemplo, então os formatos foram testados com amostras construídas (Nubank, conta corrente com ";", débito/crédito separados, OFX). Ajustar quando aparecer um arquivo real que não leia.
- **Tipo pelo sinal:**
  - No cartão, o sinal da maioria dos lançamentos é o das compras.
  - À vista (extrato de conta), negativo é despesa.
  - No cartão, créditos com cara de "pagamento" são marcados como pagamento da fatura e ignorados, porque não são gasto.
- **Já lançada:** mesma data, mesmo valor em centavos e mesma descrição normalizada que uma transação existente. Vem desmarcada.
- **Sugestão de categoria:**
  - descrição igual já usada no histórico do mês do arquivo e dos 3 meses anteriores;
  - senão, a mesma primeira palavra;
  - senão, o assunto (o mesmo dicionário dos ícones de categoria).
  - Sem sugestão, o item vem "sem categoria", desmarcado até escolher.
- **Importação tudo ou nada:** até 2.000 lançamentos por vez. "Desfazer importação" apaga todos os lançamentos criados por ela.
- **Correção colateral:** a regra de ícone de "Moradia" casava "lar" no fim de palavras ("Farmácia Popu*lar*") e agora exige a palavra inteira.

### Fase 3i: alertas, segurança e dados, limpeza (concluída)
- **Alertas derivados no cliente** (`features/alerts.ts`), como fatura e orçamento: limite da semana (80% e passou), limite de categoria, fatura fechando (2 dias), vencimento (3 dias ou vencida), recorrência lançada (desligado por padrão, como no design) e resumo semanal. No banco ficam só as preferências (`alert_prefs`) e o "lido até" (`alerts_read_at`), que acende o ponto no sino. A data de cada alerta é o dia em que ele passou a valer, por exemplo o dia em que a categoria estourou.
- **Limitação:** o "lido" é por dia. Um alerta novo no mesmo dia em que a central foi aberta não acende o ponto de novo.
- **Segurança e dados:**
  - **Exportar:** CSV com `;` e vírgula decimal, protegido contra fórmula em planilha.
  - **Apagar todos os dados:** exige digitar APAGAR e mantém conta, categorias e cartões.
  - **Excluir a conta:** pede a senha e encerra a sessão.
- **Fora do escopo:** "Bloqueio com biometria" e "PIN" do design não se aplicam a um app web/PWA, então ficaram de fora.
- **Push no aparelho:** fica para a fase 4 (PWA).
- **Limpeza:** saíram as tabelas `investment_*`, a coluna `tutorial_completed` e as rotas `/investment`, `/users/tutorial-status` e o `dashboard.ts` que nunca foi montado. O backup automático do deploy roda antes das migrações.

### Fase 4: PWA (concluída, sem push)
- **Atalhos do manifest:** "Gasto rápido" (`/?rapido=1`) e "Nova receita" (`/?nova=receita`). Aparecem ao segurar o ícone do app instalado (Android e desktop) e abrem a ação já pronta.
- **Gasto rápido** (Rapido.html): teclado numérico, que também aceita o teclado físico, as 4 categorias mais usadas no mês, forma de pagamento (lembra a última) e "Mais opções", que leva ao formulário completo com o que foi preenchido. A descrição fica com o nome da categoria.
- **Atalhos** (Ajustes): botão "Instalar" quando o navegador oferece, instruções para o iPhone e a lista de atalhos.
- **Fora do escopo:** widget de tela inicial, botão na tela de bloqueio e Siri/Assistente do design não existem para apps web.
- **Fila offline:**
  - Sem internet, ou se a rede cair no envio, lançamentos simples ficam no aparelho (`localStorage`, por usuário), com aviso fixo "Sem conexão".
  - São enviados em ordem quando a conexão volta, ou pelo "Enviar agora".
  - Erro 4xx de recusa (400, 404, 422) descarta o item e avisa. Rede, 5xx, sessão expirada (401/403) e limites temporários (408/429) mantêm na fila.
  - Parcelas e recorrências pedem conexão.
  - **Limitação:** os lançamentos guardados ainda não aparecem nas listas e totais até serem enviados.
- **Push:** não implementado, por decisão do dono. Exigiria um serviço de envio no servidor e, no iPhone, só funciona com o app instalado.
- **Correção:** o Tailwind lia os arquivos de teste e gerava CSS inválido a partir de textos de exemplo (`[-3:BRT]` do OFX). Os testes saíram da varredura.

### Revisão final antes do PR
Revisão de código da branch inteira e roteiro e2e (ver `CLAUDE.md`). O que mudou de comportamento:
- **Forma de pagamento da recorrente é versionada** (decisão do dono, com mudança de schema): migração `20261127190000_recurring_version_card` adiciona `card_id` em `recurring_rule_versions`, preenchido com o cartão atual de cada regra. Trocar o cartão vale a partir do mês escolhido, como valor, categoria e dia. Antes, a troca levava as cobranças dos últimos 24 meses para as faturas passadas do cartão novo. `recurring_rules.card_id` passa a espelhar a versão vigente hoje. Cartão que já foi usado por uma versão antiga é arquivado, não apagado.
- **Compra parcelada no cartão:** o formulário mandava a compra sem o cartão, e as parcelas ficavam À vista, fora da fatura e do limite. Corrigido.
- **Categoria arquivada ou mesclada não soma limite no orçamento** (total do mês, limite da semana, histórico). O limite continua salvo e volta se a categoria for restaurada.
- **Orçamento do primeiro uso** vai para o mês local de quem configura, não para o mês UTC do servidor.
- **Importar extrato de cartão:** estornos ficam no cartão e abatem a fatura, em vez de virar receita À vista.
- **Edição parcial de cartão ou categoria** (arquivar, restaurar) não troca mais a cor para a padrão.
- **Formulários abertos** (pagar fatura, cartão, meta, guardar na meta, variação) não perdem o que foi digitado quando os dados recarregam em segundo plano.
- **Exportar CSV:** proteção contra fórmula também em células que começam com "-" e dígito mas não são número, e com tab/CR.
- **Cookie de sessão** com `Secure` quando o `FRONTEND_URL` é https (produção: `https://fin.luka.dev.br`, com "Always Use HTTPS" ligado na Cloudflare).
