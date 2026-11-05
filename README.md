# 💰 FinControl

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)

**Sistema completo de controle financeiro pessoal com dashboards interativos**

[Início Rápido](#-início-rápido) • [Arquitetura](#-arquitetura) • [Infraestrutura](#-infraestrutura-docker) • [Documentação](#-documentação-detalhada)

</div>

---

## 📖 Sobre o Projeto

FinControl é uma aplicação web moderna e completa para gerenciamento financeiro pessoal. Desenvolvida com as melhores práticas de desenvolvimento, oferece uma interface intuitiva para controle de receitas, despesas, parcelamentos, transações recorrentes e visualização de dados através de dashboards interativos com gráficos e relatórios.

### ✨ Principais Funcionalidades

- 🔐 **Autenticação JWT** - Sistema seguro de login e registro
- 💰 **Gestão de Transações** - Central de lançamentos com receitas e despesas fixas e variáveis
- 🔄 **Transações Recorrentes** - Configure contas fixas mensais
- 📊 **Dashboard Personalizável** - Saldo, planejamento mensal e sete módulos reorganizáveis, com gráficos e valores consultáveis
- 🏷️ **Categorias Personalizadas** - Organize suas finanças do seu jeito
- 📅 **Calendário Financeiro** - Veja suas transações em formato de calendário
- 💳 **Parcelamentos** - Gerencie compras parceladas
- 🌓 **Tema Claro/Escuro** - Segue o sistema até a escolha manual, com preferência persistida no navegador
- 📈 **Relatórios** - Resumo mensal e históricos de receitas e despesas em abas
- 💰 **Planejamento de Investimento** - Valor mensal padrão e ajustes por mês, persistidos por usuário no banco
- 📱 **Interface Responsiva** - Barra lateral no desktop, navegação inferior no celular e lançamento rápido
- 🎓 **Tutorial Guiado Interativo** - Onboarding automático para novos usuários com Driver.js

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura moderna de aplicação web full-stack:

### Desenvolvimento (Local)
```mermaid
flowchart TB
    browser["Navegador"]
    subgraph compose["Docker Compose de desenvolvimento"]
        frontend["Frontend: React + Vite<br/>localhost:5173"]
        backend["Backend: Node.js + Hono<br/>localhost:3001"]
        database[("PostgreSQL 18<br/>localhost:5432")]
        frontend -->|"Proxy /api: remove o prefixo"| backend
        backend -->|"Prisma + adaptador PostgreSQL"| database
    end
    browser -->|"Interface e chamadas /api"| frontend
    browser -.->|"Acesso direto à API"| backend
```

### Produção (2 VPS)
```mermaid
flowchart TB
    browser["Navegador"]
    subgraph appVps["VPS 2: aplicação"]
        nginx["Nginx: porta 80<br/>Frontend React compilado"]
        api["Backend: porta 3001<br/>Node.js + Hono + Prisma"]
        nginx -->|"/api: remove o prefixo"| api
    end
    subgraph databaseVps["VPS 1: banco de dados"]
        postgres[("PostgreSQL 18<br/>Porta 5432")]
    end
    browser -->|"HTTP; HTTPS exige configuração adicional"| nginx
    api -->|"Conexão TCP com a VPS do banco"| postgres
```

**Arquitetura de Produção:**
- **VPS 1:** Banco de dados PostgreSQL dedicado
- **VPS 2:** Frontend (Nginx) + Backend (Node.js)
- **Comunicação:** Backend se conecta ao PostgreSQL via IP/hostname da VPS 1

### 📦 Stack Tecnológico

#### Frontend
| Tecnologia | Descrição |
|-----------|-----------|
| ![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react) | Biblioteca JavaScript para interfaces |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178C6?logo=typescript) | Superset tipado do JavaScript |
| ![Vite](https://img.shields.io/badge/Vite-7.1.9-646CFF?logo=vite) | Build tool ultrarrápido |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css) | Framework CSS utility-first |
| ![React Router](https://img.shields.io/badge/React_Router-6.26.2-CA4245?logo=react-router) | Roteamento declarativo |
| ![React Query](https://img.shields.io/badge/React_Query-5.90.10-FF4154?logo=react-query) | Gerenciamento de estado assíncrono |
| ![Recharts](https://img.shields.io/badge/Recharts-2.12.7-22B5BF) | Biblioteca de gráficos em React |
| ![Axios](https://img.shields.io/badge/Axios-1.13.2-5A29E4?logo=axios) | Cliente HTTP |
| ![Lucide React](https://img.shields.io/badge/Lucide-0.522.0-F56565) | Ícones modernos |
| ![DND Kit](https://img.shields.io/badge/DND_Kit-6.3.1-00C7B7) | Organização dos módulos do dashboard |
| Radix UI Dialog | Modais e painéis com gerenciamento de foco |
| Driver.js | Tutorial guiado |
| Vitest + Testing Library + jsdom | Testes de componentes, hooks e interação |

#### Backend
| Tecnologia | Descrição |
|-----------|-----------|
| ![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js) | Runtime JavaScript server-side |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript) | Superset tipado do JavaScript |
| ![Hono](https://img.shields.io/badge/Hono-4.10.6-E36002) | Framework web ultrarrápido |
| ![Prisma](https://img.shields.io/badge/Prisma-7.0.0-2D3748?logo=prisma) | ORM moderno para Node.js |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?logo=postgresql) | Banco de dados relacional |
| ![Zod](https://img.shields.io/badge/Zod-4.1.12-3E67B1) | Validação de schemas TypeScript |
| ![JWT](https://img.shields.io/badge/JWT-Authentication-000000?logo=json-web-tokens) | Autenticação stateless |

#### Infraestrutura
| Tecnologia | Descrição |
|-----------|-----------|
| ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker) | Containerização da aplicação |
| ![Nginx](https://img.shields.io/badge/Nginx-Production-009639?logo=nginx) | Servidor web e proxy reverso |
| ![K6](https://img.shields.io/badge/K6-Load_Testing-7D64FF?logo=k6) | Testes de carga e performance |

📚 **Documentação detalhada:**
- [Frontend README](./frontend/README.md) - Componentes, arquitetura e desenvolvimento
- [Backend README](./backend/README.md) - API, endpoints e banco de dados

---

## 🚀 Início Rápido

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- [Git](https://git-scm.com/downloads)

### Instalação em 3 Passos

1️⃣ **Clone o repositório**
```bash
git clone https://github.com/lukagouvea/fincontrol.git
cd fincontrol
```

2️⃣ **Configure as variáveis de ambiente**
```bash
# Crie o arquivo usado pelo docker-compose de desenvolvimento
cp .env.dev.example .env.dev

# (Opcional) Prepare também o arquivo de produção
cp .env.prod.example .env.prod

# Se precisar rodar backend/frontend fora do Docker, gere os envs locais
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

> 💡 **Dica rápida:** mantenha `POSTGRES_HOST=db` no `.env.dev` (os containers se enxergam pelo nome do serviço) e configure um host/IP real no `.env.prod` quando o PostgreSQL estiver fora do Docker.

> 📝 **Veja os READMEs específicos para detalhes adicionais:**
> - [Configuração do Backend](./backend/README.md#variáveis-de-ambiente)
> - [Configuração do Frontend](./frontend/README.md#variáveis-de-ambiente)

3️⃣ **Execute com Docker**
```bash
docker compose --env-file .env.dev up --build
```

Na primeira execução, aplique as migrações em outro terminal, com o banco e o backend ativos:

```bash
docker compose --env-file .env.dev exec backend npx prisma migrate deploy
```

O container de desenvolvimento gera o cliente Prisma ao iniciar, mas não aplica as migrações automaticamente.

✅ **Pronto!** Acesse:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:3001

---

## 🐳 Infraestrutura Docker

### Arquivos de Composição

O projeto possui três arquivos Docker Compose:

| Arquivo | Ambiente | Uso |
|---------|----------|-----|
| `docker-compose.yml` | **Desenvolvimento** | Hot reload, logs detalhados |
| `docker-compose.prod.yml` | **Produção: aplicação** | Imagens publicadas de backend e frontend com Nginx |
| `docker-compose.prod.db.yml` | **Produção: banco** | PostgreSQL dedicado |

### Arquivos de Ambiente

Cada arquivo `docker-compose` utiliza um arquivo `.env` dedicado para centralizar as variáveis compartilhadas entre os serviços:

| Arquivo | Finalidade | Como usar |
|---------|------------|-----------|
| `.env.dev` | Valores padrão para desenvolvimento local (credenciais do PostgreSQL, porta da API, URLs) | `docker compose --env-file .env.dev ...` |
| `.env.prod` | Configurações sensíveis e URLs públicas usadas no deploy | `docker compose --env-file .env.prod -f docker-compose.prod.yml ...` |

> 📁 Os exemplos `.env.dev.example` e `.env.prod.example` servem como base para criar seus arquivos reais (que permanecem ignorados pelo Git).
>
> 🔐 **Produção:** defina `POSTGRES_HOST` apontando para o banco externo (IP da VPS, serviço gerenciado, etc). No dev continue usando `db`, que é o hostname interno do container PostgreSQL.

### Modo Desenvolvimento

Ideal para desenvolvimento local com **hot reload** automático (carrega as variáveis de `.env.dev`):

```bash
docker compose --env-file .env.dev up --build
```

**Recursos:**
- ✅ Hot reload no frontend (Vite)
- ✅ Hot reload no backend (tsx watch)
- ✅ Volumes montados para edição em tempo real
- ✅ Logs detalhados no console
- ✅ Porta 5173 (frontend) e 3001 (backend) expostas

**Portas:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

### Modo Produção

Ambiente otimizado para deploy em servidores com arquitetura de 2 VPS.

#### 🚀 Deploy com GitHub Actions

O workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) constrói as imagens em pull requests para `main`. Em pushes para `main`, publica as imagens no Docker Hub e atualiza a VPS da aplicação por SSH.

Configure os secrets `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `VPS_HOST`, `VPS_USER` e `VPS_KEY`. O Compose de produção aponta para imagens de `lukagouvea`; ajuste esse namespace se publicar em outra conta.

O workflow copia somente o Compose da aplicação, renomeia-o para `docker-compose.yml` no servidor e executa `docker compose pull` e `docker compose up -d`. Prepare previamente o banco e um `.env` no diretório remoto com os valores de produção: o workflow não envia variáveis nem usa `--env-file .env.prod`.

#### 🔧 Deploy Manual

**Na VPS 1 (Banco de Dados):**

```bash
# Configure .env.prod a partir de .env.prod.example
docker compose --env-file .env.prod -f docker-compose.prod.db.yml up -d
docker compose --env-file .env.prod -f docker-compose.prod.db.yml logs -f db
```

**Na VPS 2 (Frontend + Backend):**

Configure `.env.prod` com `POSTGRES_HOST` apontando para a VPS do banco e aguarde o PostgreSQL aceitar conexões.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

O backend executa `prisma migrate deploy` antes de iniciar a versão compilada. O Compose de produção usa imagens publicadas; ele não compila as alterações locais da branch. Para construir imagens locais, consulte os READMEs do [frontend](./frontend/README.md) e do [backend](./backend/README.md).

O Nginx encaminha `/api/` para `backend:3001` e remove o prefixo. Mantenha `BACKEND_PORT=3001` ou ajuste também o proxy. `VITE_API_URL` é definido no build da imagem frontend; alterar apenas o `.env.prod` não modifica uma imagem já compilada.

**Otimizações:**
- ✅ Build minificado e otimizado
- ✅ Nginx como servidor web de alta performance
- ✅ Banco de dados isolado em VPS dedicada
- ✅ Containers em modo detached
- ✅ Healthcheck do PostgreSQL no Compose do banco

**Portas:**
- Aplicação completa: http://localhost (porta 80; HTTPS exige configuração adicional)
- API acessível em: http://localhost/api
- PostgreSQL (VPS 1): Port 5432

### Comandos Docker Úteis

Os comandos abaixo usam o Compose de desenvolvimento. Para produção manual, acrescente `--env-file .env.prod -f docker-compose.prod.yml` antes do subcomando.

```bash
# Ver status dos containers
docker compose --env-file .env.dev ps

# Ver logs em tempo real
docker compose --env-file .env.dev logs -f

# Ver logs de um serviço específico
docker compose --env-file .env.dev logs -f backend

# Parar containers
docker compose --env-file .env.dev down

# Parar e remover volumes (⚠️ apaga dados do banco)
docker compose --env-file .env.dev down -v

# Rebuild de um serviço específico
docker compose --env-file .env.dev up --build backend

# Acessar shell do container
docker compose --env-file .env.dev exec backend sh

# Executar migrações do Prisma
docker compose --env-file .env.dev exec backend npx prisma migrate deploy

# Reiniciar um serviço
docker compose --env-file .env.dev restart frontend
```

### Volumes e Persistência

**Desenvolvimento:**
```yaml
volumes:
  - ./backend:/app          # Código do backend (hot reload)
  - ./frontend:/app         # Código do frontend (hot reload)
  - /app/node_modules       # Protege dependências
  - fincontrol-data-dev     # Dados do PostgreSQL
```

**Produção:**
```yaml
volumes:
  - fincontrol-data-prod    # Dados do PostgreSQL persistidos
```

### Segurança em Produção

**Checklist antes de fazer deploy:**

- ✅ Altere todas as senhas padrão (`POSTGRES_PASSWORD`, etc)
- ✅ Gere um `JWT_SECRET` forte (mínimo 32 caracteres aleatórios)
- ✅ Configure HTTPS com certificados SSL (recomendado: Let's Encrypt)
- ✅ Configure firewall para expor apenas portas necessárias (80, 443)
- ✅ Implemente rate limiting no Nginx
- ✅ Configure backups automáticos do banco de dados
- ✅ Monitore logs de acesso e erros
- ✅ Mantenha os containers atualizados

---

## 🧪 Verificações de Desenvolvimento

```bash
# Frontend
cd frontend
npm run test
npm run typecheck
npm run build

# Backend (com .env configurado e cliente Prisma gerado)
cd ../backend
npm test
npm run build
```

Os testes do frontend usam Vitest, Testing Library e jsdom para cobrir navegação, formulários, calendário, relatórios, investimento e tema. Os testes do backend verificam autenticação por cookie e JWT HS256, com acesso ao Prisma substituído nos testes.

A matriz de inspeção visual e suas pendências estão em [docs/ui-verification.md](./docs/ui-verification.md).

## 🧪 Testes de Carga

O projeto inclui scripts de teste de performance usando [k6](https://k6.io/), ferramenta open-source da Grafana Labs.

### Instalação do k6

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**MacOS:**
```bash
brew install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

Antes de executar, ajuste as URLs fixas e as credenciais nos scripts para o ambiente que deseja testar.

### Scripts Disponíveis

#### 📈 Teste de Carga Geral
```bash
k6 run teste_carga.js
# ou com Docker
docker run --rm -i grafana/k6 run - < teste_carga.js
```
Sobe até 50 usuários em 30 segundos, mantém a carga por 1 minuto e reduz a zero em 10 segundos.

#### 🔐 Teste de Estresse de Login
```bash
k6 run teste_login.js
# ou com Docker
docker run --rm -i grafana/k6 run - < teste_login.js
```
Sobe até 20 usuários em 30 segundos. O script aceita respostas 200 e 401; o Nginx também pode retornar 429 por limite de tentativas.

---

## 📚 Documentação Detalhada

### Documentação por Módulo

Para informações mais detalhadas sobre cada parte do projeto:

📘 **[Backend Documentation](./backend/README.md)**
- Arquitetura da API
- Endpoints detalhados com exemplos
- Modelo de dados e relacionamentos
- Configuração do Prisma
- Autenticação e segurança
- Como desenvolver novas features

📗 **[Frontend Documentation](./frontend/README.md)**
- Arquitetura de componentes
- Estrutura de páginas e rotas
- Context API e gerenciamento de estado
- Custom hooks
- Estilização e temas
- Como adicionar novos componentes

### Estrutura de Pastas

```mermaid
flowchart TB
    root["fincontrol/"]
    root --> backend["backend/"]
    root --> frontend["frontend/"]
    root --> infra["Infraestrutura"]
    root --> docs["Documentação e validação"]
    backend --> backendSrc["src/<br/>routes, middleware e lib"]
    backend --> prisma["prisma/<br/>Schema e migrações"]
    backend --> backendTests["tests/<br/>Testes de autenticação"]
    frontend --> frontendSrc["src/<br/>components, pages, context e hooks"]
    frontend --> frontendSupport["src/<br/>services, styles, types, utils e test"]
    infra --> dev["docker-compose.yml<br/>Desenvolvimento"]
    infra --> prod["docker-compose.prod.yml<br/>Aplicação em produção"]
    infra --> db["docker-compose.prod.db.yml<br/>Banco em produção"]
    docs --> readmes["README.md<br/>frontend/README.md<br/>backend/README.md"]
    docs --> visual["docs/ui-verification.md"]
    docs --> load["teste_carga.js e teste_login.js"]
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request
