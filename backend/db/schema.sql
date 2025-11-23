-- Habilita a extensão para gerar UUIDs (se necessário)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. USUÁRIOS
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. CATEGORIAS
-- Unifica Renda e Despesa, diferenciadas pelo campo 'type'
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(20) DEFAULT '#888888',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Mantido: Impede duplicidade de nome+tipo para o mesmo usuário
    CONSTRAINT unique_category_per_user UNIQUE (user_id, name, type)
);

-- =============================================
-- 3. GRUPOS DE PARCELAMENTO
-- Cabeçalho para agrupar parcelas
-- =============================================
CREATE TABLE installment_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description VARCHAR(255),
    total_amount DECIMAL(12, 2) NOT NULL,
    total_installments INT NOT NULL CHECK (total_installments > 1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. REGRAS DE RECORRÊNCIA (Fixas)
-- Templates para gerar ou projetar transações mensais
-- =============================================
CREATE TABLE recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    
    day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = Infinito
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. TRANSAÇÕES (Tabela Mestra)
-- Rendas, Despesas, Parcelas e Ocorrências de Fixas
-- =============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL, -- Data da ocorrência
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    
    -- Vínculos Opcionais (Parcelas ou Recorrência)
    installment_group_id UUID REFERENCES installment_groups(id) ON DELETE CASCADE,
    installment_number INT,
    
    recurring_rule_id UUID REFERENCES recurring_rules(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Validação de integridade para parcelas
    CONSTRAINT check_installment_integrity CHECK (
        (installment_group_id IS NULL AND installment_number IS NULL) OR 
        (installment_group_id IS NOT NULL AND installment_number IS NOT NULL)
    )
);

-- =============================================
-- 6. ÍNDICES (Performance)
-- =============================================
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_recurring_user_active ON recurring_rules(user_id, active);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);