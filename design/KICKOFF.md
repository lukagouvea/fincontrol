# Como usar este pacote com o Claude Code

## 1. Colocar no repositório
Copie a pasta `design/` inteira para a raiz do repo do FinControl (`design/screens/` com 190 HTMLs, `DESIGN.md`, `tokens.css`, `SCREENS.md`, `screens.json`, `PRODUCT_RULES.md`). Abra qualquer `design/screens/Main.html` no navegador para ver a tela.

## 2. Acrescentar ao `CLAUDE.md` do repo
```md
## Design
- A interface segue `design/DESIGN.md` e `design/tokens.css`. Telas de referência em `design/screens/` (claro e `...Dark.html`). Mapa em `design/SCREENS.md`.
- Regras de produto em `design/PRODUCT_RULES.md`. Se o código atual divergir, registre em `design/GAP.md` e pergunte antes de mudar comportamento ou schema.
- Nunca use cores hardcoded em componentes: só variáveis de `tokens.css`. Sempre mobile e desktop (um componente responsivo), claro e escuro.
- Antes de dar uma tela por pronta: abra no navegador, tire captura em 390px e 1280px, nos dois temas, e compare com a referência.
- Uma fase por vez, um commit por tela/funcionalidade. Migrações do Prisma só depois de eu aprovar o `GAP.md`.
```

## 3. Primeiro prompt (diagnóstico, sem alterar código)
```text
Leia design/DESIGN.md, design/PRODUCT_RULES.md, design/SCREENS.md e abra algumas telas de design/screens/ para entender o visual. Depois explore este repositório (Vite/React, Hono, Prisma) e crie design/GAP.md com:
1. Para cada tela de SCREENS.md: já existe e só precisa de visual novo / existe mas falta funcionalidade / é nova / exige mudança de schema. Aponte o arquivo atual correspondente.
2. Divergências entre PRODUCT_RULES.md e o modelo atual (contas e saldos, parcelas, fatura, recorrência, categorias) e como você sugere resolver cada uma.
3. Mudanças necessárias no schema do Prisma e na API (Hono), em ordem de dependência.
4. Onde o agente de IA comportamental existente se encaixa na interface.
5. Um plano em fases com estimativa de tamanho de cada uma.
Não altere nenhum código nesta etapa.
```

## 4. Fases seguintes (um prompt por fase, depois de aprovar o GAP.md)
1. **Fundação:** `tokens.css`, tema claro/escuro/automático, AppShell responsivo, componentes base de `DESIGN.md`.
2. **Restyle** das telas existentes (sem mudar regras de negócio).
3. **Funcionalidades novas, uma por vez** (cada uma com migração + API + telas + testes), nesta ordem sugerida: primeiro uso e Ajustes → parceladas/compromissos → limite semanal e burndown → histórico e virada de mês → filtros e lote → importação → alertas.
4. **PWA:** manifest com `shortcuts`, instalação, modo offline para lançar gastos, notificações.

Em cada fase: “implemente apenas a fase X, rode os testes e mostre as capturas comparadas com a referência”.
