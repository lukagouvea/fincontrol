-- Primeiro uso e limite "Geral" do orçamento (fase 3e).

-- Contas que já existem não passam pela configuração inicial.
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" TIMESTAMP(6);
UPDATE "users" SET "onboarding_completed_at" = COALESCE("created_at", CURRENT_TIMESTAMP);

-- Limite sem categoria = parte do orçamento ainda não dividida.
ALTER TABLE "budget_limits" ALTER COLUMN "category_id" DROP NOT NULL;
CREATE UNIQUE INDEX "unique_budget_general_month" ON "budget_limits"("user_id", "month") WHERE "category_id" IS NULL;
