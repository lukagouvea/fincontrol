# Renovação visual do FinControl

Plano aprovado na conversa. Base: main 098bc28; implementação em feat/new-ui.

## Restrições

- Interface grafite/verde, temas claro/escuro, Public Sans local, mobile primeiro.
- Preservar contratos REST, banco e regras financeiras da main; sem agentes/simuladores.
- Base para PWA apenas: áreas seguras, teclado, viewport; sem instalação/offline/service worker.
- Manter todas as funções das 12 telas, modais, conta e tutorial; URLs anteriores compatíveis.

## Task 1: Fundação e navegação

- Componentes semânticos e Radix Dialog; tokens e layout responsivo.
- Central /lancamentos?tipo=despesa|receita&grupo=variaveis|fixas, padrão despesa/variaveis.
- Desktop: Início/Lançamentos/Calendário/Relatórios/Categorias/Conta. Mobile: Início/Lançamentos/Calendário/Mais.
- Testar seleção, aliases, navegação e abertura/fechamento de diálogos.

## Task 2: Formulários e lançamentos

- Tabelas desktop e listas mobile, todos os dados e ações disponíveis.
- Preservar parcelas, encerramento/edição de fixas e arquivadas, variações mensais.
- Campos com erros e estado de envio; fechar apenas no sucesso e preservar dados após falha.
- Testar payloads, retenção de preenchimento e prevenção de envio duplicado.

## Task 3: Início e relatórios

- Saldo em destaque; orçamento planejado separado do saldo; contas/recentes/agenda/categorias antes de detalhes recolhíveis.
- Sete widgets main; organizar por alças/teclado e subir/descer mobile; recuperar configuração válida.
- Relatório com abas Resumo/Despesas/Receitas e históricos compatíveis.
- Testar totais, preferências, URLs de abas e estados vazios/erro.

## Task 4: Calendário, categorias, autenticação e conta

- Grade mensal desktop e grade compacta + agenda mobile, seleção de data e Hoje sincronizados.
- Categorias acessíveis; login/cadastro/recuperação/404 na identidade visual.
- Conta com investimento salvo explicitamente, tema, tutorial e saída.
- Tutorial adaptado ao shell e instância única.

## Task 5: Verificação

- Suite de comportamento, TypeScript e build.
- Revisão independente do diff completo e correção de problemas relevantes.
- Navegador: todas as telas/overlays, 320/390/768/1024/1440, dois temas, landscape/teclado/zoom.
- Dados de desenvolvimento; comparar finanças com main, sem deploy.

## Registro de execução

- Inicial: checkout já preparado pelo usuário em feat/new-ui, limpo e idêntico à main; trabalhar nessa branch preserva o escopo aprovado sem outro checkout.
- Baseline: build passou (bundle principal 915 kB, avisos de bases Browserslist desatualizadas). TypeScript falhou em oito declarações não utilizadas preexistentes; corrigir nas áreas tocadas.
- Navegador: CUA retorna apps=[]/browsers=[] nesta sessão. Verificação visual ainda pendente; reavaliar ao final.
- Tasks 1–4 implementadas: shell responsivo, central e aliases, relatórios com abas, formulários Radix, dashboard e sete módulos, calendário, categorias, autenticação, conta e tutorial único.
- Verificações intermediárias: navegação e formulários RED→GREEN; parcelas e variação zero; retorno Hoje ao período correto; investimento salvo explicitamente; isolamento de cache entre contas; preenchimento assíncrono do investimento mensal; histórico de 12 meses buscado apenas ao expandir detalhes.
- Ruling: manter as despesas recentes no universo da main (que exclui receitas nesse widget), nomeando o módulo de forma explícita para não sugerir uma lista de todas as transações.
- Ruling: corrigir o cache da interface ao entrar/sair/trocar de conta e aguardar o logout; evita mostrar dados da conta anterior e permite apresentar falha de rede. Contratos REST preservados.
- Ruling: usar VisualViewport para adaptar os painéis ao teclado, além de dvh/safe-area; o comportamento real em iOS/Android ainda precisa da checagem visual.
- Checkpoint: suite com 16 testes, TypeScript e build aprovados; dois testes adicionais de investimento e carregamento sob demanda também passaram no ciclo RED→GREEN.
- Revisão independente final: dois achados importantes, nenhum crítico ou minor adicional. Ambos reproduzidos antes da correção: saldo semanal com investimento desconhecido e resposta de mutação antiga contaminando a sessão seguinte.
- Final: fixed saldo semanal desconhecido — teste de indisponibilidade RED→GREEN; referência semanal omitida até existir investimento válido.
- Final: fixed mutação atrasada entre sessões — teste de resposta A após login B RED→GREEN; chaves vinculadas a usuário/geração, contexto de início da mutação e verificação da sessão antes de publicar resultados.
- Verificação final: 20/20 testes em 8 arquivos; TypeScript, build e git diff --check passaram. Contraste dos tokens de texto: 48 combinações em claro/escuro acima de 4,5:1.
- QA visual continua pendente: a nova consulta CUA ainda retornou apps=[] e browsers=[]. Não declarar aprovação para merge/produção antes dessa etapa. Sem alterações no backend, contratos REST, tipos financeiros ou utilitários financeiros preexistentes.

## Foco da revisão independente

- Mobile: grade, navegação inferior, ações fixas, áreas seguras e teclado; sem ocultar informação necessária.
- Regressões financeiras: preservar universos, valores zero, parcelas, períodos, recorrências encerradas e investimento por mês.
- Modais: erro/reenvio, foco, Escape, troca entre escolha rápida e formulário, impedir envio duplicado.
- Sessão e rede: nenhuma apresentação de dados desconhecidos como zero e nenhum cache financeiro entre contas.
- Compatibilidade: URLs antigas, abas/período na URL, personalização salva e tutorial com elementos visíveis.
