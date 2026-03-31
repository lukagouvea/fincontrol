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
- � **Gestão de Transações** - Controle completo de receitas e despesas
- 🔄 **Transações Recorrentes** - Configure contas fixas mensais
- 📊 **Dashboards Interativos** - Visualize seus dados com gráficos dinâmicos
- 🏷️ **Categorias Personalizadas** - Organize suas finanças do seu jeito
- 📅 **Calendário Financeiro** - Veja suas transações em formato de calendário
- 💳 **Parcelamentos** - Gerencie compras parceladas
- 🌓 **Tema Claro/Escuro** - Interface adaptável às suas preferências
- 🎓 **Tutorial Guiado Interativo** - Onboarding automático para novos usuários com Driver.js

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura moderna de aplicação web full-stack:

### Desenvolvimento (Local)
```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  React + TypeScript + Vite + Tailwind CSS               │
│  http://localhost:5173                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│                      BACKEND                            │
│  Node.js + TypeScript + Hono + Prisma                   │
│  http://localhost:3001                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Prisma ORM
                     │
┌────────────────────▼────────────────────────────────────┐
│                    DATABASE                             │
│  PostgreSQL 14                                          │
│  localhost:5432                                         │
└─────────────────────────────────────────────────────────┘
```

### Produção (2 VPS)
```
┌─────────────────────────────────────────────────────────┐
│                       VPS 1                             │
│                 PostgreSQL Database                     │
│                     Port 5432                           │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │ Conexão TCP
                           │
┌──────────────────────────┴──────────────────────────────┐
│                       VPS 2                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Nginx (Port 80/443)                 │   │
│  │          Proxy Reverso + Frontend                │   │
│  └────────────────────┬─────────────────────────────┘   │
│                       │                                 │
│  ┌────────────────────▼─────────────────────────────┐   │
│  │              Backend (Port 3001)                 │   │
│  │        Node.js + Hono + Prisma                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
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
| ![DND Kit](https://img.shields.io/badge/DND_Kit-6.3.1-00C7B7) | Drag and drop acessível |

#### Backend
| Tecnologia | Descrição |
|-----------|-----------|
| ![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js) | Runtime JavaScript server-side |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript) | Superset tipado do JavaScript |
| ![Hono](https://img.shields.io/badge/Hono-4.10.6-E36002) | Framework web ultrarrápido |
| ![Prisma](https://img.shields.io/badge/Prisma-7.0.0-2D3748?logo=prisma) | ORM moderno para Node.js |
| ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791?logo=postgresql) | Banco de dados relacional |
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

---

## � Início Rápido

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

> � **Dica rápida:** mantenha `POSTGRES_HOST=db` no `.env.dev` (os containers se enxergam pelo nome do serviço) e configure um host/IP real no `.env.prod` quando o PostgreSQL estiver fora do Docker.

> �📝 **Veja os READMEs específicos para detalhes adicionais:**
> - [Configuração do Backend](./backend/README.md#variáveis-de-ambiente)
> - [Configuração do Frontend](./frontend/README.md#variáveis-de-ambiente)

3️⃣ **Execute com Docker**
```bash
docker compose --env-file .env.dev up --build
```

✅ **Pronto!** Acesse:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:3001

---

## 🐳 Infraestrutura Docker

### Arquivos de Composição

O projeto possui dois arquivos Docker Compose para diferentes ambientes:

| Arquivo | Ambiente | Uso |
|---------|----------|-----|
| `docker-compose.yml` | **Desenvolvimento** | Hot reload, logs detalhados |
| `docker-compose.prod.yml` | **Produção** | Build otimizado, Nginx |

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

#### 🚀 Deploy Automático (Recomendado)

O projeto inclui um script de deploy automatizado:

```bash
./deploy.sh
```

O script executa:
1. Build das imagens Docker otimizadas
2. Deploy do banco de dados (VPS 1)
3. Aguarda o banco estar pronto para aceitar conexões
4. Deploy do backend e frontend (VPS 2)
5. Execução das migrações do Prisma

> ⚠️ **Importante:** O backend executa `prisma migrate deploy` durante a inicialização. É **necessário aguardar** que o PostgreSQL esteja completamente inicializado e aceitando conexões antes de subir o backend, caso contrário as migrações falharão.

#### 🔧 Deploy Manual

Se preferir executar manualmente:

**Na VPS 1 (Banco de Dados):**
```bash
# Subir apenas o PostgreSQL
docker compose -f docker-compose.db.prod.yml up -d

# Verificar se está rodando e aceitando conexões
docker compose -f docker-compose.db.prod.yml logs -f
```

**Na VPS 2 (Frontend + Backend):**
```bash
# Configure as variáveis de ambiente apontando para a VPS 1
# Edite .env.prod com o IP/hostname da VPS 1

# Aguarde o banco estar pronto (importante!)
# Você pode testar a conexão com:
# psql -h <IP_VPS1> -U postgres -d fincontrol

# Suba os serviços
docker compose -f docker-compose.prod.yml up -d
```

**Otimizações:**
- ✅ Build minificado e otimizado
- ✅ Nginx como servidor web de alta performance
- ✅ Banco de dados isolado em VPS dedicada
- ✅ Containers em modo detached
- ✅ Healthchecks para garantir disponibilidade

**Portas:**
- Aplicação completa: http://localhost (porta 80)
- API acessível em: http://localhost/api
- PostgreSQL (VPS 1): Port 5432

### Comandos Docker Úteis

```bash
# Ver status dos containers
docker compose ps

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f backend

# Parar containers
docker compose down

# Parar e remover volumes (⚠️ apaga dados do banco)
docker compose down -v

# Rebuild de um serviço específico
docker compose up --build backend

# Acessar shell do container
docker compose exec backend sh

# Executar migrações do Prisma
docker compose exec backend npx prisma migrate deploy

# Reiniciar um serviço
docker compose restart frontend
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

---

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

### Scripts Disponíveis

#### 📈 Teste de Carga Geral
```bash
k6 run teste_carga.js
# ou com Docker
docker run --rm -i grafana/k6 run - < teste_carga.js
```
Simula 50 usuários simultâneos por 1 minuto.

#### 🔐 Teste de Estresse de Login
```bash
k6 run teste_login.js
# ou com Docker
docker run --rm -i grafana/k6 run - < teste_login.js
```
Testa a capacidade de processar 20 logins simultâneos.

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

```
fincontrol/
├── 📁 backend/                 # API REST + Banco de Dados
│   ├── src/                    # Código-fonte TypeScript
│   │   ├── routes/             # Endpoints da API
│   │   ├── middleware/         # Autenticação e validações
│   │   └── lib/                # Prisma client
│   ├── prisma/                 # Schema e migrações
│   └── README.md               # 📘 Documentação do backend
│
├── 📁 frontend/                # Interface React
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas da aplicação
│   │   ├── context/            # Context API (Auth, Finance, Theme)
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # Chamadas à API
│   │   └── types/              # TypeScript types
│   └── README.md               # � Documentação do frontend
│
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção
├── teste_carga.js              # Teste de performance k6
├── teste_login.js              # Teste de estresse k6
└── README.md                   # 📖 Este arquivo
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request
