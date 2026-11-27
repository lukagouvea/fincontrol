# Design system — Finanças pessoais (pt-BR, neutro de marca)

Fonte da verdade visual: os arquivos em `design/screens/` (HTML estático, claro e escuro). Os valores abaixo foram extraídos deles; `tokens.css` tem os mesmos valores como variáveis. **Recriar em componentes React; não copiar o markup com estilos inline.**

## Princípios
- Calmo e legível: fundo quente (`--bg`), cartões brancos, um verde profundo como cor de ação. Sem emoji; ícones de traço (stroke 1.8, 24px, cantos arredondados).
- Um valor grande por tela (Space Grotesk 600) e o resto em texto de apoio.
- Alvo de toque mínimo 44px. Botão principal 56px, pílula.
- Cor nunca é o único sinal: despesas têm “−”, receitas “+”, estados têm texto.
- Dinheiro sempre `R$ 1.234,56`, pt-BR; despesas em `--expense`, receitas em `--income`.

## Tipografia
- Inter (400/500/600) para interface; Space Grotesk (500/600/700) para títulos de tela e **todos os valores monetários**.
- Mobile: título de tela 22–28; valor hero 42–44 (letter-spacing −0.02em); valor de card 26–34; corpo 15; apoio 13; legenda 11–12.
- Desktop: título de página 32; valor de card 30–34; corpo 15; apoio 13; cabeçalho de tabela 12 caixa-alta com tracking .04em.

## Cores semânticas
| Papel | Claro | Escuro |
|---|---|---|
| Fundo | #F5F2EA | #121714 |
| Superfície/card | #FFFFFF | #1B221E |
| Borda | #E6E1D5 | #2C352F |
| Texto | #16201C | #EDF1EE |
| Texto secundário | #5B6660 | #9AA6A0 |
| Primária | #1E4D3B (tint #E3EEE8) | #58AD88 (tint #1F3A2F) |
| Receita | #0B5A4D | #5FC9A8 |
| Despesa | #A8480F | #F08A4B |
| Cartão Aurora / Vento | #1E4D3B / #2F5D8F | #58AD88 / #5E93CC |
Gráficos: 6 cores em `--chart-1..6`; série “estourou” usa `--chart-2` (laranja).
Texto sobre botão primário: branco no claro, `#0E1A14` no escuro (`--on-primary`).

## Formas e espaçamento
Card 20px (padding 16 mobile, 20 desktop) · campo 52px/raio 16 · botão 56px pílula · chip 44px pílula · tile de ícone 44px/raio 14 · folha raio 28 em cima com alça 40×5 · diálogo raio 24, padding 28, largura 520 (620 nos formulários longos) · scrim `--scrim` · barra de progresso 8px.
Layout mobile: 390px de referência, padding lateral 20, gap vertical 12–16.

## Componentes (criar nesta ordem)
`AppShell` (barra inferior no mobile, lateral no desktop) · `PageHeader` · `Card` · `Money` · `Button` (primary/secondary/danger/link) · `Field` (label, input, hint, erro) · `Chip`/`FilterChip` · `Segmented` · `Toggle` (52×32) · `ProgressBar` · `ListRow` (tile + título/subtítulo + valor) · `Sheet` (mobile) / `Dialog` (desktop) como **um único componente responsivo** · `Toast` com “Desfazer” · `EmptyState` · `Badge` · gráficos (`BarChart`, `Burndown`, `Donut`).

## Navegação e responsivo
- Mobile (<1024): barra inferior com 5 itens (Início, Transações, Cartões, Orçamento, Relatórios). Metas, Recorrentes e Categorias entram por Início/Ajustes. Sino e engrenagem no cabeçalho do Início.
- Desktop (≥1024): barra lateral de 248px (Início, Transações, Cartões, Orçamento, Metas, Recorrentes, Relatórios, Categorias; “Ajustes” e perfil no rodapé) e conteúdo com padding 32/40. Cards em grade fluida; tabelas no lugar de listas.
- **Uma só base de código**: o desktop não é outra interface. Folha no mobile vira diálogo ou painel lateral no desktop (as duas versões estão desenhadas).

## Modo escuro
Tema Claro/Escuro/Automático (Ajustes › Aparência), guardado por dispositivo. Aplicar com `data-theme` no `<html>` e variáveis de `tokens.css`. Nenhuma cor deve ficar hardcoded em componente.

## Estados a implementar além das telas estáticas
foco visível em tudo que é interativo; erro de campo (texto + borda `--expense`); carregando (skeleton nos cards e listas); desativado; vazio por seção; sem conexão (a PWA precisa avisar e enfileirar lançamentos).
