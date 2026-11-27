# FinControl

Monorepo: `frontend/` (Vite + React 18 + React Query + Tailwind, PWA) e `backend/` (Hono + Prisma + Postgres).

## Comandos
- Frontend: `cd frontend && npm run typecheck && npm test && npm run build`. O build não faz checagem de tipos.
- Backend: `cd backend && npm run typecheck && npm test` (node:test via tsx).
- E2E: `cd frontend && npm run e2e`. Roteiro completo de uso (criar conta, configurar, categorias, transações, recorrente, meta, orçamento, relatórios, sair/entrar, excluir conta) contra o app e o backend reais, em 360px e 1280px. Precisa do backend de dev e do Vite em `:5174` (ou `E2E_URL`). Cada rodada cria e exclui a própria conta. Relatório em `frontend/.e2e/report`.
- Capturas do frontend: `cd frontend && npm run shots`. Gera capturas em 360px (Android), 390px (iPhone; usa WebKit se disponível) e 1280px, nos dois temas, em `frontend/.shots/`, e falha se alguma tela tiver rolagem horizontal.

## Design
- A interface segue `design/DESIGN.md` e `design/tokens.css`. As telas de referência estão em `design/screens/` (claro e `...Dark.html`) e o mapa em `design/SCREENS.md`.
- As regras de produto estão em `design/PRODUCT_RULES.md`. As divergências e decisões ficam em `design/GAP.md`. Se o código atual divergir, registre lá e pergunte antes de mudar comportamento ou schema.
- Nunca use cores hardcoded em componentes, só as variáveis de `tokens.css`. Cada tela é um componente responsivo único (mobile e desktop) e precisa funcionar nos temas claro e escuro.
- Antes de dar uma tela por pronta: abra no navegador, tire capturas em 360px, 390px e 1280px nos dois temas e compare com a referência.
- Uma fase por vez, um commit por tela ou funcionalidade.
