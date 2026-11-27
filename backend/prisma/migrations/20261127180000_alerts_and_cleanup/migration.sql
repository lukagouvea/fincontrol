-- Alertas (fase 3i) e limpeza do que saiu do app: investimento mensal e o
-- tutorial antigo (driver.js). O backup do deploy roda antes das migrações.

ALTER TABLE "users" ADD COLUMN "alert_prefs" JSONB;
ALTER TABLE "users" ADD COLUMN "alerts_read_at" TIMESTAMP(6);

DROP TABLE IF EXISTS "investment_overrides";
DROP TABLE IF EXISTS "investment_settings";
ALTER TABLE "users" DROP COLUMN IF EXISTS "tutorial_completed";
