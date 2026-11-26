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
| Nova transação `Nova`, `NovaAVista`, `NovaReceita` / `DeskNova` | F | `Shared/TransactionForm.tsx`, `Layout/QuickAdd.tsx` | 2 → 3a | O campo "Pago com" depende de 3a. |
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
- **Pendente (segurança, já existia):** as rotas não conferem se o `categoryId` enviado pertence ao usuário. O `cardId` já é conferido. Corrigir junto com a fase 3b.
