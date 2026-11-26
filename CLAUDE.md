# FinControl

Monorepo: `frontend/` (Vite + React 18 + React Query + Tailwind, PWA) e `backend/` (Hono + Prisma + Postgres).

## Comandos
- Frontend: `cd frontend && npm run typecheck && npm test && npm run build`. O build não faz checagem de tipos.
- Backend: `cd backend && npm run typecheck && npm test` (node:test via tsx).
- Capturas do frontend: `cd frontend && npm run shots`. Gera capturas em 390px e 1280px, nos dois temas, em `frontend/.shots/`.

## Design
- A interface segue `design/DESIGN.md` e `design/tokens.css`. As telas de referência estão em `design/screens/` (claro e `...Dark.html`) e o mapa em `design/SCREENS.md`.
- As regras de produto estão em `design/PRODUCT_RULES.md`. As divergências e decisões ficam em `design/GAP.md`. Se o código atual divergir, registre lá e pergunte antes de mudar comportamento ou schema.
- Nunca use cores hardcoded em componentes, só as variáveis de `tokens.css`. Cada tela é um componente responsivo único (mobile e desktop) e precisa funcionar nos temas claro e escuro.
- Antes de dar uma tela por pronta: abra no navegador, tire capturas em 390px e 1280px nos dois temas e compare com a referência.
- Uma fase por vez, um commit por tela ou funcionalidade.
