# Regras de produto implícitas no design

O design foi pensado com este modelo. **Onde o FinControl atual divergir, não mude sozinho: registre em `design/GAP.md` e pergunte.**

## Modelo
- **Sem contas e sem saldo.** Só duas formas de pagamento: **cartão de crédito** (cadastrado) e **À vista** (Pix, dinheiro, débito; sem cadastro).
- Cartão: apelido, final (4 dígitos, nunca o número completo), limite, dia de fechamento, dia de vencimento, cor. Exemplos: Aurora •••• 4821 (limite 6.000, fecha dia 8, vence 15) e Vento •••• 7730 (limite 3.000, fecha 20, vence 27).
- Transação: valor, tipo (despesa/receita), descrição, categoria, data, forma de pagamento (cartão ou À vista), recorrência opcional, parcelas opcionais.
- **Fatura**: derivada das transações do cartão pela data de fechamento. “Pagar fatura” registra o pagamento e libera o limite; **não é um gasto novo** (as compras já contam no mês em que foram feitas).
- **Recorrentes**: lançamentos mensais automáticos (aluguel, assinaturas, salário). Editar vale, por padrão, a partir do mês atual (o usuário escolhe outro mês ou "corrigir todo o histórico"); encerrar não apaga o histórico; pausar existe.
- **Parceladas**: compra de N parcelas iguais no cartão. O limite do cartão cai pelo **valor total** na compra; **cada parcela conta como gasto no mês da fatura em que cai**, não tudo de uma vez. Tela “Compromissos futuros” soma parcelas dos próximos meses e as fixas.
- **Categorias**: ícone (sem cor escolhida; a cor é atribuída da paleta), mesclar e arquivar (apagar pede destino das transações).
- **Orçamento**: total mensal + limite por categoria. O “orçamento variável” = total − recorrentes fixas.
- **Limite da semana**: derivado do orçamento variável restante; mostra quanto resta, o ritmo por dia até domingo e alerta ao chegar a 80% e ao passar. (Os números do protótipo são ilustrativos; **a fórmula exata precisa ser confirmada**.)
- **Burndown** (Relatórios, mês e semana): linha do restante do orçamento variável por dia, linha ideal tracejada, real, e estimativa (mediana pontilhada com faixa de 80% e chance de fechar dentro do limite, por simulação Monte Carlo sobre o gasto diário do mês e dos 3 meses anteriores).
- **Metas**: valor-alvo, já guardado, prazo opcional; “Guardar na meta” soma valor. A sobra de um mês fechado pode ser guardada numa meta.
- **Histórico e virada de mês**: meses fechados guardam um resumo (gasto, orçamento, sobra, por categoria). No dia 1, aviso “X fechou. Sobraram R$ …” e o novo mês já nasce com orçamento repetido, recorrentes lançadas e parcelas na fatura.
- **Importar extrato (CSV/OFX)**: escolhe o cartão, lê o arquivo no cliente, mostra revisão com categoria sugerida, marca **duplicados** (mesma data, valor e descrição) e “sem categoria”, e permite desfazer a importação inteira.
- **Filtros e lote**: filtros por período, pagamento, categoria e valor; seleção múltipla com mudar categoria, mudar pagamento e excluir. **Excluir sempre tem confirmação e depois um toast “Desfazer”** de alguns segundos.
- **Alertas** (central + preferências): limite da semana, limite de categoria, fatura fechando (2 dias antes), vencimento, recorrência lançada, resumo semanal.
- **Primeiro uso**: boas-vindas → criar conta/entrar → cartão → orçamento mensal → Início com checklist “Comece por aqui”. Estados vazios para Início, Transações e Cartões.
- **Ajustes**: perfil, aparência, alertas, segurança e dados (exportar CSV, importar, apagar dados, excluir conta), moeda e idioma (só pt-BR/BRL por ora), ajuda.

## Convenções
- Data de referência do protótipo: quarta, 18/11/2026. Todos os números de exemplo são fictícios e coerentes entre telas.
- Valores monetários em centavos inteiros no banco; formatação só na interface.

## Fora do escopo do design (decidir antes)
- **Agente de IA de finanças comportamentais do FinControl**: não está desenhado. Sugestão a validar com o dono: insights como cartões na tela Início e itens na central de Alertas, com o chat/“ghost card” numa folha própria.
- **Widget de tela inicial**: não existe em PWA (principalmente iOS). Implementar apenas atalhos do manifest (`shortcuts`: “Gasto rápido”, “Nova receita”) e a tela “Gasto rápido”; a parte de widget de “Atalhos e widget” vira “Atalhos”.
- **Push notifications**: dependem do navegador; no iOS exigem a PWA instalada.
- Login/conta: o design mostra e-mail e senha + recuperação; confirmar com o que o FinControl já usa.
