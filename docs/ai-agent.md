> **Plano futuro, não implementado.** Proposta de 27/11/2026 para um assistente com IA. Nada daqui está no código. Antes de começar, as mudanças de regra (privacidade, consentimento) entram em [`design/PRODUCT_RULES.md`](../design/PRODUCT_RULES.md) e [`design/GAP.md`](../design/GAP.md).

# Assistente com IA

## Objetivo

- **Importar extrato de qualquer banco.** O parser de CSV (`frontend/src/features/import/parse.ts`) não foi calibrado com extratos reais e falha em formatos comuns.
- **Comando por texto ou voz.** O usuário diz o lançamento ou a operação ("gastei 45 no ifood ontem no nubank") e o assistente prepara.
- **Foto de recibo ou fatura.** Imagem ou PDF vira lançamento (ou lote de lançamentos).

## Decisões

- **LLM por API, sem modelo local.** Provedores gratuitos: Gemini, Groq ou NVIDIA. O backend só repassa as chamadas, então a VPS de 1 GB dá conta.
- **A IA só propõe, nunca grava.** Toda escrita vira uma proposta que o usuário confirma. Quem grava é o app, pelas rotas que já existem. Assim:
  - validação, regras de cartão/fatura, parcelas e "desfazer" continuam iguais;
  - um erro do modelo ou um texto malicioso dentro de um recibo ou extrato no máximo gera uma proposta errada, que o usuário recusa.
- **Mandar o mínimo de dados.** No CSV, só o cabeçalho e algumas linhas para mapear as colunas, e só as descrições sem categoria para sugerir uma.
- **O app funciona sem IA.** O parser e as regras de categoria atuais continuam sendo o caminho padrão. A IA entra quando eles falham, ou quando a cota acabou e o app segue sem ela.

## Cuidados com API gratuita

- **Privacidade.** Planos gratuitos costumam permitir que o provedor use os dados para treinar modelos (é o caso do Gemini grátis). Conferir os termos de cada provedor antes de escolher. O aviso de consentimento precisa dizer para onde os dados vão.
- **Limites.** A cota grátis vale para a chave inteira, não por usuário, e limites e modelos mudam sem aviso. Precisa de limite de uso por usuário por dia.
- **Sem amarrar a um provedor.** Groq e NVIDIA usam o formato da API da OpenAI, e o Gemini tem um modo compatível. Uma camada pequena permite trocar de provedor ou usar um reserva só por configuração.
- **Melhor uso de cada um:**
  - Gemini para imagem e PDF;
  - Groq para transcrever voz (Whisper);
  - qualquer modelo pequeno para mapear colunas e sugerir categorias.

## Arquitetura

```
App (texto, voz, foto, CSV)
      │
      ▼
POST /assistant          (rota nova, autenticada como as outras)
      │
      ├─ monta o contexto: data de hoje, categorias, cartões, mês atual
      ├─ chama a LLM com as ferramentas
      │     ├─ ferramenta de LEITURA → o backend executa e devolve à LLM → repete
      │     └─ ferramenta de ESCRITA → não executa; vira uma "proposta"
      └─ responde: { texto, propostas[] }
      │
      ▼
App mostra as propostas como cartões → usuário confirma → app chama as rotas existentes
```

### Ferramentas

**Leitura** (executam direto):
- `listar_transacoes(mes, categoria?, cartao?)`
- `resumo_mes(mes)`: gastos por categoria, orçamento, quanto sobra
- `fatura(cartao, mes)`
- `metas()`

Podem chamar as próprias rotas por dentro (`app.request(...)` do Hono, com a sessão do usuário). Assim não é preciso reescrever as consultas, e cada usuário só vê os próprios dados.

**Escrita** (só geram proposta):
- `propor_transacao({ data, descricao, valor, tipo, categoria, cartao?, parcelas? })` → `POST /transactions` ou `/transactions/installment`
- `propor_lote([...])` → `POST /imports` (foto de fatura, CSV)
- `propor_aporte_meta(meta, valor)` → `POST /goals/:id/contributions`
- `propor_edicao(id, mudancas)` e `propor_exclusao(id)`: o cartão de confirmação mostra o antes e o depois

Os parâmetros das ferramentas saem dos esquemas zod das rotas. A LLM recebe exatamente o formato que o backend aceita, e a resposta dela passa pela mesma validação.

### Cada tipo de entrada

| Entrada | Fluxo |
|---|---|
| **Texto** | Vai direto para o laço do agente. |
| **Voz** | O app grava, o backend transcreve (por exemplo, Whisper na Groq) e o resultado segue como texto. A transcrição aparece na tela para corrigir antes de enviar. |
| **Foto ou PDF** | Um modelo com visão extrai os itens e devolve `propor_lote`. Recibo vira 1 lançamento, fatura vira N. |
| **CSV/OFX** | O parser atual tenta primeiro. Se falhar, a LLM recebe o cabeçalho e algumas linhas e devolve o mapeamento das colunas (data, descrição, valor, coluna D/C, formato da data, linhas a pular). O mapeamento fica salvo pela "cara" do arquivo, então o mesmo banco não chama a LLM de novo. Categorias: regras atuais primeiro, LLM só para o que sobrar. Tudo cai na tela de revisão que já existe. |

### Backend

1. **Adaptador de provedor:** `chat(mensagens, ferramentas)`, com implementação no formato da API da OpenAI e provedor reserva configurável.
2. **Laço com teto:**
   - no máximo cerca de 5 chamadas de ferramenta por pedido;
   - tempo limite;
   - toda resposta validada com zod, e se vier inválida, nova tentativa.
3. **Limite de uso** por usuário por dia.
4. **Conversa curta:** sem histórico salvo no começo. O app manda as últimas mensagens a cada pedido.
5. **Provedor falso** com respostas fixas para o `node:test` e o e2e, que não podem depender da LLM real.

### Frontend

- **Ponto de entrada:** botão do assistente (por exemplo, toque longo no "+").
- **Tela:** campo de texto com microfone e câmera.
- **Resposta:** cartões de proposta com Confirmar, Editar e Descartar. "Editar" abre a folha de transação existente, já preenchida.

## Ordem de implementação

1. Adaptador de provedor e mapeamento de colunas do CSV (uma chamada que devolve JSON, sem laço nem ferramentas).
2. Foto e PDF virando lote na tela de revisão.
3. Laço com ferramentas de leitura ("quanto gastei com mercado esse mês?"). Sem risco, porque só lê.
4. Ferramentas de escrita por proposta, com texto e voz.

Em cada etapa: consentimento de envio de dados ao provedor e registro da mudança na regra "o arquivo não sai do aparelho" antes do código.

## Falhas conhecidas do parser de CSV atual

Encontradas em testes com amostras em 27/11/2026. Podem ser corrigidas sem IA:

| Caso | Resultado |
|---|---|
| Linhas de título antes do cabeçalho num CSV separado por vírgula | Erro "Não reconheci as colunas": a detecção de separador olha a primeira linha, que tem uma coluna só, e escolhe `;`. |
| Sinal numa coluna separada `D/C` | Tudo vira positivo, e despesas viram receitas. |
| Data sem ano (`01/11`) | Todas as linhas são descartadas. |
| Sinal de menos tipográfico (`−12,30`) | A linha é descartada. |
| Campo entre aspas com quebra de linha | Não suportado: o arquivo é dividido por linha antes de tratar as aspas. |
| Cabeçalho depois da 10ª linha | Só é reconhecido pela dedução por conteúdo. |
