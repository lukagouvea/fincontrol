-- Orçamento por categoria e pausa de recorrência (fase 3c).

-- AlterTable
ALTER TABLE "recurring_rules" ADD COLUMN "paused_from" DATE;
ALTER TABLE "recurring_rules" ADD COLUMN "paused_until" DATE;
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_pause_range"
  CHECK ("paused_from" IS NULL OR "paused_until" IS NULL OR "paused_until" >= "paused_from");

-- CreateTable
CREATE TABLE "budget_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(12,2),
    "repeat" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_limits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "budget_limits_amount_non_negative" CHECK ("amount" IS NULL OR "amount" >= 0),
    CONSTRAINT "budget_limits_month_first_day" CHECK (EXTRACT(DAY FROM "month") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_budget_limit_month" ON "budget_limits"("category_id", "month");
CREATE INDEX "idx_budget_limits_user_month" ON "budget_limits"("user_id", "month");

-- AddForeignKey
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "budget_limits" ADD CONSTRAINT "budget_limits_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
