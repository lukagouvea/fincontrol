# 🔌 FinControl Backend

API REST de controle financeiro pessoal com Node.js, TypeScript, Hono, Prisma e PostgreSQL.

## Tecnologias e estrutura

O Dockerfile usa Node.js 22 e os arquivos Compose usam PostgreSQL 18 Alpine. As dependências incluem Hono 4, Prisma 7, Zod 4, bcryptjs e o adaptador PostgreSQL do Prisma. Consulte [package.json](./package.json) e [package-lock.json](./package-lock.json) para as versões declaradas e instaladas.

```mermaid
flowchart TB
    entry["src/index.ts<br/>CORS e registro de rotas"]
    entry --> auth["routes/auth.ts<br/>Cadastro, login, logout e perfil"]
    entry --> middleware["middleware/auth.ts<br/>Validação do cookie JWT"]
    middleware --> finance["routes/<br/>categories, transactions,<br/>recurring e investment"]
    entry --> users["routes/users.ts<br/>Tutorial com validação do cookie"]
    auth --> prisma["lib/prisma.ts<br/>Cliente com adaptador PostgreSQL"]
    finance --> prisma
    users --> prisma
    schema["prisma/schema.prisma"] -->|"prisma generate"| generated["src/generated/<br/>Cliente Prisma"]
    generated --> prisma
    prisma --> db[("PostgreSQL")]
    migrations["prisma/migrations/"] -->|"prisma migrate deploy"| db
    config["prisma.config.ts<br/>Conexão e migrações"] -.-> migrations
    tests["tests/auth.test.ts"] -.->|"Testa com Prisma substituído"| auth
    tests -.-> middleware
    tests -.-> users
```

`src/routes/dashboard.ts` existe, mas não está registrado em `src/index.ts`. Os resumos e gráficos usados pela interface são calculados no frontend a partir dos dados financeiros.

## Desenvolvimento local

Use Node.js 22.12+ da linha 22, npm e um PostgreSQL acessível. Execute a partir de `backend/`:

```bash
npm ci
cp .env.example .env
```

Edite `.env`: o hostname `db` do exemplo pertence à rede Docker. Para um banco exposto na máquina local, use:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fincontrol?schema=public
FRONTEND_URL=http://localhost:5173
PORT=3001
JWT_SECRET=substitua-por-um-segredo-aleatorio
```

Depois gere o cliente, aplique as migrações e inicie a API:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

A API responde em http://localhost:3001. A conexão do Prisma é configurada em `prisma.config.ts` e o cliente é gerado em `src/generated/`.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL usada pelo Prisma e pelo adaptador da aplicação |
| `FRONTEND_URL` | Origem permitida pelo CORS; deve coincidir com a URL do navegador, sem barra final |
| `PORT` | Porta HTTP; padrão do código: `3001` |
| `JWT_SECRET` | Chave para assinar e verificar JWT HS256; configure um segredo próprio |
| `NODE_ENV` | Ambiente de execução, definido pelos containers |

Nos arquivos Compose, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST` e `POSTGRES_PORT` montam a `DATABASE_URL`; `BACKEND_PORT` define `PORT`. Rodando o backend diretamente, configure a URL completa.

### Scripts e Prisma

```bash
npm run dev      # tsx watch
npm test         # node:test com tsx
npm run build    # Compila TypeScript em dist/
npm start        # Aplica migrações e inicia dist/src/index.js

npx prisma generate
npx prisma migrate dev --name nome_da_migracao
npx prisma migrate deploy
npx prisma studio
```

A suíte atual substitui métodos do Prisma e verifica o cookie emitido no login, perfil, tutorial e middleware, além da rejeição de tokens ausentes, expirados ou com assinatura/algoritmo incorretos. Gere o cliente Prisma e configure `.env` antes de executá-la.

## Autenticação e URLs da API

O JWT HS256 é enviado no cookie HttpOnly `auth_token`, com validade de sete dias. Cadastro e login retornam `{ "user": ... }`, sem `passwordHash`; o token é enviado por `Set-Cookie`. O cliente deve enviar cookies nas chamadas seguintes (`credentials: "include"` no fetch ou `withCredentials: true` no Axios).

O cookie atual usa `SameSite=Lax`, `path=/` e `secure: false`. A configuração de HTTPS e dos atributos do cookie em produção deve considerar esses valores do código.

| Acesso | Base | Exemplo |
|---|---|---|
| Backend direto | `http://localhost:3001` | `/auth/login` |
| Proxy Vite/Nginx | `/api` na origem do frontend | `/api/auth/login` |

O backend registra rotas sem `/api`. Os proxies removem esse prefixo. Os caminhos abaixo são relativos ao backend; categorias, transações, recorrências, investimento, perfil e status do tutorial exigem sessão.

### Fluxo de autenticação

```mermaid
sequenceDiagram
    participant Browser as Navegador
    participant API as API Hono
    participant DB as PostgreSQL
    Browser->>API: POST /auth/login com email e senha
    API->>DB: Buscar usuário pelo email
    DB-->>API: Usuário e hash da senha
    API->>API: Comparar senha com bcryptjs
    alt Credenciais válidas
        API->>API: Assinar JWT com HS256
        API-->>Browser: 200 com user e Set-Cookie auth_token HttpOnly
        Browser->>API: Requisição protegida com cookie auth_token
        API->>API: Verificar assinatura e expiração do JWT
        API->>DB: Consultar dados do usuário autenticado
        DB-->>API: Dados
        API-->>Browser: Resposta JSON
    else Credenciais inválidas
        API-->>Browser: 401 com erro de credenciais
    end
```

### Autenticação

| Método | Caminho | Corpo / retorno |
|---|---|---|
| POST | `/auth/signup` | `{ name, email, password }`; cria usuário, define cookie e retorna `{ user }` com status 201 |
| POST | `/auth/login` | `{ email, password }`; define cookie e retorna `{ user }` |
| POST | `/auth/logout` | Remove cookie e retorna mensagem |
| GET | `/auth/me` | Retorna `{ user }`; sem sessão válida, `{ user: null }` com status 401 |

O cadastro exige nome com pelo menos dois caracteres, email válido e senha com pelo menos seis caracteres. Email já cadastrado retorna 409; credenciais inválidas no login retornam 401. O perfil inclui `tutorialCompleted`.

### Categorias

| Método | Caminho | Comportamento |
|---|---|---|
| GET | `/categories?type=expense` | Lista categorias ativas; `type` é opcional (`income` ou `expense`) |
| POST | `/categories` | Cria com `{ name, type, description?, color? }` |
| PUT | `/categories/:id` | Atualiza nome, descrição e cor; preserva o tipo |
| DELETE | `/categories/:id` | Marca `active=false` e retorna mensagem, preservando os vínculos históricos |

Nome e tipo são únicos por usuário. Criar uma categoria já ativa retorna 409; criar uma categoria com o mesmo nome e tipo de uma inativa a reativa e retorna 200. Uma criação nova retorna 201.

### Transações e parcelamentos

| Método | Caminho | Comportamento |
|---|---|---|
| GET | `/transactions?month=11&year=2026` | Mês e ano obrigatórios; retorna um array, ordenado por data decrescente |
| POST | `/transactions` | Cria transação simples; retorna a transação com status 201 |
| POST | `/transactions/installment` | Cria o grupo e suas parcelas; retorna `{ message, groupId }` com status 201 |
| PUT | `/transactions/:id` | Atualiza os campos informados de uma transação |
| DELETE | `/transactions/:id` | Exclui uma transação simples ou o grupo inteiro se o ID for de uma parcela; retorna mensagem |

Exemplo de transação simples:

```json
{
  "description": "Almoço",
  "amount": 45.50,
  "date": "2026-11-04T12:00:00.000Z",
  "type": "expense",
  "categoryId": "00000000-0000-4000-8000-000000000001"
}
```

O `categoryId` deve ser o UUID de uma categoria existente. Valores devem ser positivos e datas devem usar datetime ISO 8601. A listagem inclui a categoria e `installmentInfo: { current, total }` nas parcelas, ou `null` nas transações simples; nela, `amount` é convertido para número.

Para parcelar, envie `description`, `totalAmount`, `totalInstallments` (de 2 a 60), `date` e `categoryId` para `/transactions/installment`. As parcelas são despesas mensais; a diferença de arredondamento fica na primeira parcela.

### Recorrências e variações mensais

| Método | Caminho | Comportamento |
|---|---|---|
| GET | `/recurring?type=expense` | Lista regras ativas, com filtro opcional por tipo |
| POST | `/recurring` | Cria regra; retorna 201 |
| PUT | `/recurring/:id` | Atualiza descrição, valor, dia, vigência e categoria |
| DELETE | `/recurring/:id` | Define `endDate` como a data atual, encerrando a vigência; retorna mensagem |
| GET | `/recurring/variations` | Lista transações vinculadas a recorrências no formato de variações |
| POST | `/recurring/:id/variation` | Cria ou atualiza o valor de uma recorrência para um mês |

Exemplo de regra:

```json
{
  "description": "Aluguel",
  "amount": 1500,
  "type": "expense",
  "day": 10,
  "startDate": "2026-11-01T00:00:00.000Z",
  "endDate": null,
  "categoryId": "00000000-0000-4000-8000-000000000001"
}
```

O payload usa `day` (1–31), mapeado para `dayOfMonth` no banco. A categoria é opcional; `endDate` pode ser omitido ou `null`. A listagem devolve `day`, datas e categoria em formato adaptado ao frontend.

Uma variação usa `{ "year": 2026, "month": 10, "amount": 0, "type": "expense" }`. **Aqui, `month` vai de 0 a 11**; em transações e investimento vai de 1 a 12. Variações ficam persistidas como transações com `recurringRuleId`. O frontend combina as regras vigentes com essas variações para calcular os valores mensais, inclusive valor zero.

### Investimento

| Método | Caminho | Corpo / retorno |
|---|---|---|
| GET | `/investment` | `{ defaultMonthlyAmount }`; padrão zero se não configurado |
| PUT | `/investment` | Salva `{ defaultMonthlyAmount }` |
| GET | `/investment/effective?month=11&year=2026` | Retorna `{ defaultMonthlyAmount, overrideMonthlyAmount, effectiveMonthlyAmount }` |
| PUT | `/investment/override` | Salva `{ year, month, amount }` para um mês específico |
| DELETE | `/investment/override?month=11&year=2026` | Remove o valor específico e volta a usar o padrão |

Valores são não negativos. O valor específico do mês tem prioridade sobre o padrão, inclusive quando é zero. As configurações são persistidas por usuário no PostgreSQL.

### Tutorial

| Método | Caminho | Corpo / retorno |
|---|---|---|
| GET | `/users/tutorial-status` | `{ tutorialCompleted: boolean }` |
| PATCH | `/users/tutorial-status` | Recebe `{ tutorialCompleted: boolean }` e retorna `{ user }` atualizado |

O campo começa como `false` para novos usuários. A interface usa esse status para iniciar o tutorial e permite revê-lo pelo painel da conta. O CORS atual não lista `PATCH` em `allowMethods`; para chamadas pelo navegador, use o proxy de mesma origem ou ajuste essa configuração ao executar frontend e backend em origens diferentes.

## Modelo de dados

O [schema Prisma](./prisma/schema.prisma) define:

| Modelo | Finalidade |
|---|---|
| `User` | Perfil, hash da senha e `tutorialCompleted` |
| `Category` | Categoria por usuário, com tipo, cor, descrição e estado ativo |
| `Transaction` | Receita/despesa, parcela ou variação vinculada a recorrência |
| `RecurringRule` | Valor padrão, dia e vigência de uma receita/despesa fixa |
| `InstallmentGroup` | Valor total e quantidade de parcelas; exclusão em cascata das parcelas |
| `InvestmentSetting` | Investimento mensal padrão, único por usuário |
| `InvestmentOverride` | Valor específico, único por usuário, ano e mês |

### Relacionamentos

```mermaid
erDiagram
    User ||--o{ Category : possui
    User ||--o{ Transaction : registra
    User ||--o{ RecurringRule : configura
    User ||--o{ InstallmentGroup : possui
    User ||--o| InvestmentSetting : configura
    User ||--o{ InvestmentOverride : ajusta
    Category |o--o{ Transaction : classifica
    Category |o--o{ RecurringRule : classifica
    RecurringRule |o--o{ Transaction : vincula_variacoes
    InstallmentGroup |o--o{ Transaction : agrupa_parcelas

    User {
        uuid id PK
        string email UK
        string name
        string passwordHash
        boolean tutorialCompleted
    }
    Category {
        uuid id PK
        uuid userId FK
        string name
        string type
        boolean active
    }
    Transaction {
        uuid id PK
        uuid userId FK
        uuid categoryId FK
        uuid recurringRuleId FK
        uuid installmentGroupId FK
        decimal amount
        datetime date
        string type
        int installmentNumber
    }
    RecurringRule {
        uuid id PK
        uuid userId FK
        uuid categoryId FK
        decimal amount
        int dayOfMonth
        datetime startDate
        datetime endDate
    }
    InstallmentGroup {
        uuid id PK
        uuid userId FK
        decimal totalAmount
        int totalInstallments
    }
    InvestmentSetting {
        uuid id PK
        uuid userId FK,UK
        decimal defaultMonthlyAmount
    }
    InvestmentOverride {
        uuid id PK
        uuid userId FK
        int year
        int month
        decimal amount
    }
```

O diagrama mostra os principais campos. As relações opcionais de uma transação são categoria, recorrência e grupo de parcelas; o schema também define as restrições compostas por usuário, nome/tipo da categoria e ano/mês do investimento.

Valores monetários são armazenados como `Decimal(12, 2)`. A API converte alguns retornos para número (como listagem de transações e investimento); os consumidores devem considerar a serialização dos demais retornos do Prisma.

## Testando com cURL

Exemplos para acesso direto ao backend, usando um arquivo de cookies:

```bash
# Cadastro (também inicia a sessão)
curl -c /tmp/fincontrol-cookies.txt http://localhost:3001/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"João","email":"joao@example.com","password":"senha123"}'

# Login
curl -c /tmp/fincontrol-cookies.txt http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"joao@example.com","password":"senha123"}'

# Perfil autenticado
curl -b /tmp/fincontrol-cookies.txt http://localhost:3001/auth/me

# Criar categoria
curl -b /tmp/fincontrol-cookies.txt http://localhost:3001/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alimentação","type":"expense","color":"#4CAF50"}'
```

## Docker

A partir da raiz do projeto, com `.env.dev` preparado:

```bash
docker compose --env-file .env.dev up --build
# Em outro terminal, após a inicialização:
docker compose --env-file .env.dev exec backend npx prisma migrate deploy
```

O estágio `dev` gera o cliente Prisma e inicia `tsx watch`; as migrações devem ser aplicadas separadamente. O estágio `runner` usa o código compilado e executa as migrações via `npm start` antes de iniciar a API.

Para construir imagens a partir de `backend/`:

```bash
docker build --target dev -t fincontrol-backend:dev .
docker build --target runner -t fincontrol-backend:local .
```

O Compose de produção baixa imagens publicadas e exige banco acessível antes da inicialização. Consulte o [README principal](../README.md) para a configuração das duas VPS e do workflow de deploy.

## Contribuindo

Registre novas rotas em `src/index.ts`, valide payloads com Zod e aplique `authMiddleware` às rotas financeiras. O middleware disponibiliza o usuário em `c.var.userId`. Atualize esta documentação e execute os testes e a compilação pertinentes.

[Voltar ao README principal](../README.md)
