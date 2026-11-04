# Renovação visual — implementação e validação

Branch: `feat/new-ui`, derivada da `main` no commit `098bc28`.

## Implementado

- Grafite e verde discreto, temas claro/escuro, Public Sans local e favicon FinControl.
- Barra lateral no desktop e navegação inferior no celular/tablet.
- Central de lançamentos, abas de relatórios e compatibilidade com os endereços anteriores.
- Listas adaptadas ao celular, detalhes das recorrências, arquivadas e parcelas.
- Formulários e painéis Radix com foco, erros, preservação de preenchimento e prevenção de envio duplicado.
- Início com saldo e planejamento lado a lado, composição recolhível; sete módulos da main e organização acessível.
- Calendário compacto e agenda do dia, categorias, autenticação e conta.
- Investimento com salvamento explícito e isolamento de respostas por conta e sessão.
- Gráficos com valores consultáveis sem hover; histórico de doze meses carregado sob demanda.
- Áreas seguras, viewport dinâmico e adaptação dos painéis ao teclado.

## Verificação automática realizada

| Verificação | Resultado |
|---|---|
| TypeScript | Passou |
| Vitest + Testing Library | 32 testes passaram, em 9 arquivos |
| Build de produção | Passou |
| `git diff --check` | Passou |
| Contraste dos tokens de texto | 48 combinações em claro/escuro ≥ 4,5:1 |
| Fonte e favicon locais no build | Presentes |
| Revisão independente de código | Dois achados importantes reproduzidos e corrigidos com regressões |

Os testes exercitam componentes e providers reais, substituindo apenas o adaptador HTTP:
navegação, endereços antigos, abas e períodos, erros de rede, formulários, parcelas,
variação zero, arquivadas, recorrências encerradas, investimento, troca de conta,
respostas atrasadas e recuperação de preferências inválidas.

Os cálculos do relatório foram extraídos da main; serviços REST e utilitários
financeiros preexistentes não foram alterados. O backend recebeu posteriormente uma
correção de autenticação: verificação JWT com algoritmo HS256 explícito, coberta por dois testes. O módulo de despesas recentes mantém
o filtro original e recebeu um nome que explicita esse universo.

## Validação visual pendente

A ferramenta de navegador não disponibilizou apps nem navegadores nesta sessão.
As verificações automáticas e a inspeção do CSS não substituem a inspeção visual.
A aprovação para merge/produção permanece condicionada à etapa abaixo.

Executar em ambiente de desenvolvimento com dados representativos:

- [ ] Revisar todas as telas e painéis em 320, 390, 768, 1024 e 1440 px, nos dois temas.
- [ ] Entrar, cadastrar conta, consultar a indisponibilidade de recuperação e abrir a 404.
- [ ] Início: saldo, planejamento, contas, recentes, semana, categorias, detalhes e organização.
- [ ] Central: despesas/receitas × fixas/variáveis; criar, editar, excluir, encerrar, arquivadas e variações.
- [ ] Relatórios: três abas, períodos, valores por categoria e investimento padrão/específico.
- [ ] Calendário: seleção de dia, setas, Hoje, virada de ano e formulários com data preservada.
- [ ] Categorias: criação, edição, exclusão e seleção de cores por teclado.
- [ ] Conta: tema, investimento, tutorial e saída.
- [ ] Verificar teclado virtual, landscape, safe areas, zoom, foco e retorno ao acionador.
- [ ] Verificar descrições extensas, valores grandes/negativos, ausência de dados e sessão expirada.
- [ ] Confirmar ausência de rolagem horizontal da página e conteúdo coberto pela navegação.

Instalação PWA, service worker, sincronização offline, publicação e funcionalidades
experimentais permanecem fora desta etapa, conforme o plano aprovado.

## Refinamento de densidade no celular

- Saldo e orçamento na mesma linha, receitas/despesas abaixo e composição expansível.
- Contas e despesas recentes com prévia de três itens e acesso aos demais.
- Módulos sem altura mínima no celular; estados vazios compactos.
- Cabeçalhos, navegação, filtros, relatórios, agenda e formulários com menor espaçamento.
- Categorias exibidas diretamente como lista de valores no celular; gráfico circular no desktop.
- Controles mantêm altura mínima de 44 px; a semana pode rolar dentro do módulo em telas estreitas.
- Testes de interação e resumo financeiro passaram primeiro por falha e depois pela implementação.
- A revisão independente não identificou achados importantes remanescentes neste refinamento.

A matriz visual acima permanece pendente: não houve navegador disponível para renderização.

## Navegação e cache do calendário

Selecionar dias dos meses anterior/seguinte volta a navegar para o mês correspondente.
A agenda e os formulários usam a data selecionada, inclusive na virada do ano.
Os dois meses anteriores/seguintes são antecipados no cache; dados ficam recentes por
cinco minutos e meses sem observador permanecem em cache por quinze minutos.
A grade é mantida durante consultas de transações. Carregamento e falhas são indicados
por mês/dia; uma agenda pendente ou com erro não apresenta saldo zero nem estado vazio.
Dez testes cobrem navegação por clique/teclado, Hoje, cache com resposta lenta,
falhas de conexão, nova tentativa, datas dos formulários e limites da grade.
Quando o mês começa no domingo, a grade inclui a semana anterior completa e
continua com 42 dias. Casos de regressão: novembro de 2026, janeiro de 2023,
agosto de 2026 e fevereiro bissexto de 2024.
