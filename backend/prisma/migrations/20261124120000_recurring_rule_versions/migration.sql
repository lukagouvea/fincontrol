-- Histórico de versões das regras recorrentes (valor, categoria e dia com vigência)
-- e identificação das variações pelo mês da ocorrência, não pelo dia exato.

-- CreateTable
CREATE TABLE "recurring_rule_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category_id" UUID,
    "day_of_month" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_recurring_version_month" ON "recurring_rule_versions"("rule_id", "effective_from");

-- AddForeignKey
ALTER TABLE "recurring_rule_versions" ADD CONSTRAINT "recurring_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "recurring_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recurring_rule_versions" ADD CONSTRAINT "recurring_rule_versions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Backfill: uma versão por regra existente, vigente desde o mês de início,
-- com os valores atuais (o histórico já sobrescrito não é recuperável).
INSERT INTO "recurring_rule_versions" ("rule_id", "effective_from", "amount", "category_id", "day_of_month")
SELECT "id", date_trunc('month', "start_date")::date, "amount", "category_id", "day_of_month"
FROM "recurring_rules";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "occurrence_month" DATE;

-- Backfill: mês da ocorrência das variações existentes.
UPDATE "transactions"
SET "occurrence_month" = date_trunc('month', "date")::date
WHERE "recurring_rule_id" IS NOT NULL;

-- Dedupe: a busca antiga pelo dia exato podia criar mais de uma variação para
-- a mesma regra no mesmo mês (quando o dia da regra mudava). Mantém a mais recente.
DELETE FROM "transactions" t
USING (
    SELECT "id",
           row_number() OVER (
               PARTITION BY "recurring_rule_id", "occurrence_month"
               ORDER BY "created_at" DESC NULLS LAST, "id" DESC
           ) AS rn
    FROM "transactions"
    WHERE "recurring_rule_id" IS NOT NULL
) d
WHERE t."id" = d."id" AND d.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "unique_recurring_occurrence" ON "transactions"("recurring_rule_id", "occurrence_month");
