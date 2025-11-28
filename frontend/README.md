# 🎨 FinControl Frontend

Interface moderna e responsiva desenvolvida com React, TypeScript e Tailwind CSS para gerenciamento financeiro pessoal.

---

## 📖 Sobre

Frontend da aplicação FinControl, responsável por:
- 🎨 Interface intuitiva e responsiva
- 📊 Visualização de dados com gráficos interativos
- 🔐 Autenticação e gestão de sessão
- 💰 CRUD completo de transações e categorias
- 🌓 Tema claro/escuro persistente

---

## 🚀 Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| ![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react) | 18.3.1 | Biblioteca UI |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.5.4-3178C6?logo=typescript) | 5.5.4 | Superset tipado |
| ![Vite](https://img.shields.io/badge/Vite-7.1.9-646CFF?logo=vite) | 7.1.9 | Build tool |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?logo=tailwind-css) | 3.4.17 | Framework CSS |
| ![React Router](https://img.shields.io/badge/React_Router-6.26.2-CA4245?logo=react-router) | 6.26.2 | Roteamento |
| ![React Query](https://img.shields.io/badge/React_Query-5.90.10-FF4154?logo=react-query) | 5.90.10 | Estado assíncrono |
| ![Recharts](https://img.shields.io/badge/Recharts-2.12.7-22B5BF) | 2.12.7 | Gráficos |
| ![Axios](https://img.shields.io/badge/Axios-1.13.2-5A29E4?logo=axios) | 1.13.2 | HTTP client |
| ![Lucide React](https://img.shields.io/badge/Lucide-0.522.0-F56565) | 0.522.0 | Ícones |
| ![DND Kit](https://img.shields.io/badge/DND_Kit-6.3.1-00C7B7) | 6.3.1 | Drag & Drop |

---

## 📂 Estrutura do Projeto

```
frontend/
├── src/
│   ├── App.tsx                      # Componente raiz
│   ├── AppRouter.tsx                # Configuração de rotas
│   ├── index.tsx                    # Entry point
│   ├── index.css                    # Estilos globais + Tailwind
│   │
│   ├── components/                  # Componentes reutilizáveis
│   │   ├── Auth/
│   │   │   └── ProtectedRoute.tsx   # HOC para rotas protegidas
│   │   ├── Dashboard/               # Widgets do dashboard
│   │   ├── Expenses/                # Modais de despesas
│   │   ├── Income/                  # Modais de receitas
│   │   ├── Layout/                  # Layout e navegação
│   │   └── Shared/                  # Componentes reutilizáveis
│   │
│   ├── context/                     # Context API
│   │   ├── AuthContext.tsx          # Autenticação e usuário
│   │   ├── FinanceContext.tsx       # Estado financeiro global
│   │   └── ThemeContext.tsx         # Tema claro/escuro
│   │
│   ├── hooks/                       # Custom hooks
│   │   ├── useCategories.ts         # Hook de categorias
│   │   ├── useFixedTransactions.ts  # Hook de transações fixas
│   │   ├── useMonthlyVariations.ts  # Hook de variações mensais
│   │   └── useTransactions.ts       # Hook de transações
│   │
│   ├── pages/                       # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Categories.tsx
│   │   ├── Auth/                    # Login e Registro
│   │   ├── Expenses/                # Despesas fixas e variáveis
│   │   ├── Income/                  # Receitas fixas e variáveis
│   │   └── History/                 # Histórico e relatórios
│   │
│   ├── services/                    # Chamadas à API
│   │   ├── api.ts                   # Cliente Axios configurado
│   │   ├── authService.ts
│   │   ├── categoryService.ts
│   │   ├── fixedTransactionService.ts
│   │   └── transactionService.ts
│   │
│   ├── types/                       # Definições TypeScript
│   │   ├── AuthTypes.ts
│   │   └── FinanceTypes.ts
│   │
│   └── utils/                       # Funções utilitárias
│       ├── dateUtils.tsx
│       ├── financeUtils.tsx
│       └── typeGuards.ts
│
├── public/                          # Arquivos estáticos
├── vite.config.ts                   # Configuração Vite
├── tailwind.config.js               # Configuração Tailwind
├── nginx.conf                       # Nginx (produção)
├── Dockerfile                       # Multi-stage build
└── README.md                        # Este arquivo
```

---

## 🎯 Funcionalidades Principais

### 📊 Dashboard Interativo
- Gráfico de pizza por categoria
- Histogramas de gastos mensais
- Calendário financeiro semanal
- Transações recentes
- Contas a vencer
- Widgets com drag-and-drop

### 💰 Gestão de Transações
- Receitas e despesas variáveis
- Transações recorrentes (fixas)
- Parcelamentos
- Filtros avançados
- Histórico completo

### 🏷️ Categorias
- Criação personalizada
- Cores customizáveis
- Separação por tipo (receita/despesa)
- Arquivamento de categorias

### 🔐 Autenticação
- Login com JWT
- Registro de usuários
- Rotas protegidas
- Logout automático em caso de erro

### 🌓 Temas
- Modo claro/escuro
- Persistência de preferência
- Toggle rápido no header

---

## 🛠️ Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação Local

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:5173

### Scripts Disponíveis

```bash
npm run dev       # Servidor Vite com hot reload
npm run build     # Build de produção
npm run preview   # Preview do build de produção
npm run lint      # Executar ESLint
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do frontend:

```bash
cp .env.example .env
```

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base da API | `/api` |

**Nota:** Em desenvolvimento, o Vite usa proxy configurado em `vite.config.ts` para encaminhar `/api` para `http://localhost:3001`.

---

## 🎨 Arquitetura

### Context API

**AuthContext:**
- Gerencia autenticação e sessão
- Persiste token em localStorage
- Logout automático em erro 401

**FinanceContext:**
- Estado global de transações e categorias
- Funções CRUD compartilhadas

**ThemeContext:**
- Tema claro/escuro
- Sincronização com localStorage

### Custom Hooks

Toda lógica de negócio está em hooks reutilizáveis:

```tsx
// Exemplo de uso
const { transactions, isLoading, createTransaction } = useTransactions();
```

### Services

Camada de abstração para chamadas à API:

```typescript
// services/categoryService.ts
export const categoryService = {
  getAll: (type?: string) => api.get('/categories', { params: { type } }),
  create: (data) => api.post('/categories', data),
  // ...
};
```

---

## 🐳 Docker

### Modo Desenvolvimento

```bash
# Da raiz do projeto
docker compose up frontend
```

### Modo Produção

Build otimizado servido pelo Nginx:

```bash
docker compose -f docker-compose.prod.yml up frontend
```

---

## 🤝 Contribuindo

### Adicionar Nova Página

1. Criar arquivo em `src/pages/`
2. Adicionar rota em `AppRouter.tsx`
3. Adicionar link no `Sidebar.tsx`

### Adicionar Novo Componente

1. Criar em `src/components/[categoria]/`
2. Usar TypeScript para props
3. Seguir convenções de nomenclatura

### Padrões de Código

```typescript
// Props sempre tipadas
interface ComponentProps {
  title: string;
  onClose: () => void;
}

// Componente funcional
export const Component: React.FC<ComponentProps> = ({ title, onClose }) => {
  return <div>{/* JSX */}</div>;
};
```

---

## 📚 Recursos Úteis

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router](https://reactrouter.com)
- [React Query](https://tanstack.com/query)

---

[⬆ Voltar ao README principal](../README.md)
