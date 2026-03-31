# 🎓 Sistema de Onboarding/Tutorial Guiado - FinControl

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tecnologias Utilizadas](#tecnologias-utilizadas)
3. [Arquitetura](#arquitetura)
4. [Instalação](#instalação)
5. [Como Usar](#como-usar)
6. [Customização](#customização)
7. [Resolução de Problemas](#resolução-de-problemas)

---

## 🎯 Visão Geral

Sistema completo de tutorial guiado para novos usuários do FinControl, implementado com **Driver.js** e persistência no banco de dados PostgreSQL.

### Funcionalidades

✅ **Auto-início Inteligente**: Tutorial inicia automaticamente no primeiro login  
✅ **Persistência no Banco**: Status salvo no PostgreSQL (não LocalStorage)  
✅ **Navegação Flexível**: Botões Anterior/Próximo/Pular  
✅ **Reinício Manual**: Botão "Ver Tutorial Novamente" nas configurações  
✅ **Integração com React Query**: Cache e sincronização automática  
✅ **UX Otimizada**: Destaques no DOM, animações suaves, design responsivo  

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Hono**: Framework web para Node.js
- **Prisma ORM**: Gerenciamento de banco de dados
- **PostgreSQL**: Persistência do status do tutorial
- **Zod**: Validação de schemas

### Frontend
- **React 18**: Biblioteca UI
- **Driver.js 1.3+**: Biblioteca de tour guiado
- **React Query**: Gerenciamento de estado assíncrono
- **TypeScript**: Type-safety
- **Tailwind CSS**: Estilização

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│            FRONTEND (React)                 │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   useTutorial Hook                  │   │
│  │   - Gerencia Driver.js instance     │   │
│  │   - React Query (cache)             │   │
│  │   - Auto-início logic               │   │
│  └──────────┬──────────────────────────┘   │
│             │                               │
│  ┌──────────▼──────────────────────────┐   │
│  │   RestartTutorialButton Component   │   │
│  └──────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               │ HTTP/REST API
               │
┌──────────────▼──────────────────────────────┐
│            BACKEND (Hono)                   │
│                                             │
│  GET  /users/tutorial-status                │
│  PATCH /users/tutorial-status               │
└──────────────┬──────────────────────────────┘
               │
               │ Prisma ORM
               │
┌──────────────▼──────────────────────────────┐
│         DATABASE (PostgreSQL)               │
│                                             │
│  users.tutorial_completed: BOOLEAN          │
└─────────────────────────────────────────────┘
```

---

## 📦 Instalação

### 1️⃣ Backend

**a) Execute a migração do Prisma:**

```bash
cd backend
npx prisma migrate deploy
```

A migração adiciona o campo `tutorial_completed` na tabela `users`.

**b) Reinicie o backend:**

```bash
# Se estiver usando Docker
docker compose restart backend

# Ou localmente
npm run dev
```

### 2️⃣ Frontend

**a) Instale as dependências:**

```bash
cd frontend
npm install
```

Isso instalará o `driver.js` automaticamente (já adicionado ao package.json).

**b) (Opcional) Importe o CSS customizado:**

No seu `index.css` ou arquivo de estilos globais:

```css
/* Estilos padrão do Driver.js (obrigatório) */
@import 'driver.js/dist/driver.css';

/* Estilos customizados do FinControl (opcional) */
@import './styles/tutorial-custom.css';
```

---

## 🚀 Como Usar

### 1️⃣ Integração no Componente Principal

No seu `App.tsx` ou layout principal autenticado:

```tsx
import { useTutorial } from './hooks/useTutorial';

export const App = () => {
  // Chame o hook - ele gerencia tudo automaticamente
  useTutorial();

  return (
    <div>
      {/* Seu conteúdo */}
    </div>
  );
};
```

**Importante:** O hook deve ser chamado em um componente que renderiza **APÓS** o login, onde o usuário já está autenticado.

### 2️⃣ Adicionar IDs aos Elementos do DOM

Para que o Driver.js possa destacar os elementos, adicione os IDs correspondentes:

```tsx
// Dashboard
<div id="dashboard-overview">
  <h1>Visão Geral Financeira</h1>
  {/* ... */}
</div>

// Botão de adicionar transação
<button id="btn-add-transaction">
  Adicionar Transação
</button>

// Menu de navegação
<nav>
  <Link to="/categories" id="menu-categories">
    Categorias
  </Link>
  <Link to="/recurring" id="menu-recurring">
    Recorrentes
  </Link>
  <Link to="/calendar" id="menu-calendar">
    Calendário
  </Link>
</nav>

// Toggle de tema
<button id="theme-toggle" onClick={toggleTheme}>
  {theme === 'dark' ? '🌙' : '☀️'}
</button>
```

### 3️⃣ Botão de Reiniciar Tutorial (Configurações)

Na sua página de configurações:

```tsx
import { RestartTutorialButton } from '../components/Shared/RestartTutorialButton';

export const ConfiguracoesPage = () => {
  return (
    <div>
      <h1>Configurações</h1>
      
      <section>
        <h2>Tutorial</h2>
        <p>Reveja o tour guiado pelas funcionalidades do FinControl.</p>
        <RestartTutorialButton />
      </section>
    </div>
  );
};
```

---

## 🎨 Customização

### Modificar os Passos do Tutorial

Edite o array `tutorialSteps` em [useTutorial.tsx](./src/hooks/useTutorial.tsx):

```tsx
const tutorialSteps: DriveStep[] = [
  {
    element: '#seu-elemento-id',
    popover: {
      title: 'Seu Título',
      description: 'Sua descrição aqui',
      side: 'bottom', // top, bottom, left, right
      align: 'center', // start, center, end
    },
  },
  // ... mais passos
];
```

### Modificar Textos dos Botões

No `driverConfig`:

```tsx
const driverConfig: Config = {
  nextBtnText: 'Avançar →',
  prevBtnText: '← Voltar',
  doneBtnText: 'Finalizar ✓',
  closeBtnText: '✕',
  progressText: 'Passo {{current}} de {{total}}',
  // ...
};
```

### Customizar Estilos

Edite [tutorial-custom.css](./src/styles/tutorial-custom.css) ou adicione classes CSS:

```css
/* Mudar cor do overlay */
.driver-overlay {
  background: rgba(0, 0, 0, 0.7) !important;
}

/* Customizar botão "Próximo" */
.driver-popover-next-btn {
  background: #10b981 !important;
}
```

---

## 🐛 Resolução de Problemas

### ❌ Tutorial não inicia automaticamente

**Possíveis causas:**

1. **Elementos DOM não encontrados**
   - Verifique se os IDs estão corretos no DOM
   - Use `console.log` para debugar se os elementos existem

2. **Hook não está sendo chamado no lugar certo**
   - Certifique-se de que está em um componente autenticado
   - Verifique se o React Query está inicializado

3. **Status do tutorial já está como completado**
   - Verifique no banco: `SELECT tutorial_completed FROM users WHERE id = 'seu-id';`
   - Atualize manualmente: `UPDATE users SET tutorial_completed = false WHERE id = 'seu-id';`

### ❌ Erro 401 ao chamar API

**Solução:**
- Verifique se o cookie `auth_token` está sendo enviado
- Confirme que o CORS está configurado para aceitar credentials

```ts
// backend/src/index.ts
app.use('/*', cors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // ← IMPORTANTE
}));
```

### ❌ Migração do Prisma falhou

**Solução:**

Execute manualmente a migração SQL:

```sql
-- No PostgreSQL
ALTER TABLE users ADD COLUMN tutorial_completed BOOLEAN NOT NULL DEFAULT false;
```

---

## 📊 Estrutura de Arquivos Criados

```
backend/
├── prisma/
│   ├── schema.prisma (modificado - campo tutorialCompleted)
│   └── migrations/
│       └── 20260129000000_add_tutorial_completed/
│           └── migration.sql
└── src/
    └── routes/
        └── users.ts (novo - endpoints do tutorial)

frontend/
├── src/
│   ├── hooks/
│   │   └── useTutorial.tsx (novo)
│   ├── services/
│   │   └── tutorialService.ts (novo)
│   ├── components/
│   │   └── Shared/
│   │       └── RestartTutorialButton.tsx (novo)
│   ├── styles/
│   │   └── tutorial-custom.css (novo - opcional)
│   └── types/
│       └── AuthTypes.ts (modificado - campo tutorialCompleted)
├── package.json (modificado - dependência driver.js)
└── TUTORIAL_INTEGRATION_EXAMPLE.tsx (exemplo de uso)
```

---

## 📝 Endpoints da API

### GET `/users/tutorial-status`

Retorna o status do tutorial do usuário logado.

**Response:**
```json
{
  "tutorialCompleted": false
}
```

### PATCH `/users/tutorial-status`

Atualiza o status de conclusão do tutorial.

**Request Body:**
```json
{
  "tutorialCompleted": true
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@example.com",
    "tutorialCompleted": true,
    "createdAt": "2026-01-29T00:00:00.000Z"
  }
}
```

---

## 🎯 Fluxo de Funcionamento

1. **Usuário faz login**
2. **Frontend chama `/auth/me`** → Retorna dados do user (incluindo `tutorialCompleted`)
3. **Hook `useTutorial` é montado**
4. **React Query busca status** → `GET /users/tutorial-status`
5. **Se `tutorialCompleted === false`:**
   - Aguarda 500ms (DOM renderizar)
   - Inicia o Driver.js automaticamente
6. **Usuário completa ou pula o tutorial**
7. **Callback `onDestroyed` dispara**
8. **Mutation envia** → `PATCH /users/tutorial-status { tutorialCompleted: true }`
9. **Backend atualiza no PostgreSQL**
10. **React Query invalida cache** → Próximo login não mostra tutorial

---

## 🔗 Links Úteis

- [Driver.js Documentação](https://driverjs.com/)
- [React Query Documentação](https://tanstack.com/query/latest)
- [Prisma ORM](https://www.prisma.io/docs)

---

## 👨‍💻 Autor

Desenvolvido como parte do projeto **FinControl** 💰

---

## 📄 Licença

Este código faz parte do FinControl e segue a mesma licença do projeto principal.
