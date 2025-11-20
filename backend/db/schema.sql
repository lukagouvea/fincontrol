-- Tabela de Usuários (Usuario)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE
);

-- Tabela de Categorias (Categoria)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(7) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')), -- 'Renda' ou 'Despesa'
    color VARCHAR(7),
    UNIQUE(user_id, name, type)
);

-- Tabela Base para Rendas (Renda) - Abstração
-- Esta tabela não é criada diretamente, mas serve como base para as outras.

-- Tabela para Rendas Fixas (RendaFixa)
CREATE TABLE fixed_incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NOT NULL,
    end_date DATE,
    recurrence_day INTEGER NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31)
);

-- Tabela para Variações Mensais de Renda Fixa (Variação Mensal Renda)
CREATE TABLE income_variations (
    id SERIAL PRIMARY KEY,
    fixed_income_id INTEGER NOT NULL REFERENCES fixed_incomes(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    UNIQUE (fixed_income_id, year, month)
);

-- Tabela para Rendas Variáveis (RendaVariavel)
CREATE TABLE variable_incomes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    reception_date DATE NOT NULL
);

-- Tabela Mestra para Compras Parceladas (CompraParcelada)
CREATE TABLE installment_purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    installments_count INTEGER NOT NULL,
    purchase_date DATE NOT NULL
);

-- Tabela para Parcelas (Parcela)
CREATE TABLE installments (
    id SERIAL PRIMARY KEY,
    purchase_id INTEGER NOT NULL REFERENCES installment_purchases(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL
);

-- Tabela Base para Despesas (Despesa) - Abstração

-- Tabela para Despesas Fixas (DespesaFixa)
CREATE TABLE fixed_expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NOT NULL,
    end_date DATE,
    recurrence_day INTEGER NOT NULL CHECK (recurrence_day BETWEEN 1 AND 31)
);

-- Tabela para Variações Mensais de Despesa Fixa (Variação Mensal Despesa)
CREATE TABLE expense_variations (
    id SERIAL PRIMARY KEY,
    fixed_expense_id INTEGER NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    UNIQUE (fixed_expense_id, year, month)
);

-- Tabela para Despesas Variáveis (DespesaVariavel)
CREATE TABLE variable_expenses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL
);

-- Adicionando Índices para otimizar consultas
CREATE INDEX idx_categories_user_type ON categories(user_id, type);
CREATE INDEX idx_fixed_incomes_user_id ON fixed_incomes(user_id);
CREATE INDEX idx_variable_incomes_user_id ON variable_incomes(user_id);
CREATE INDEX idx_installment_purchases_user_id ON installment_purchases(user_id);
CREATE INDEX idx_installments_purchase_id ON installments(purchase_id);
CREATE INDEX idx_fixed_expenses_user_id ON fixed_expenses(user_id);
CREATE INDEX idx_variable_expenses_user_id ON variable_expenses(user_id);
