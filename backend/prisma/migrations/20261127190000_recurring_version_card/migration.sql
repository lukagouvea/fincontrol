-- Forma de pagamento versionada: trocar o cartão de uma recorrente passa a
-- valer de um mês em diante, sem levar as ocorrências antigas para as faturas
-- passadas do cartão novo. Aditiva: nada é apagado.
ALTER TABLE "recurring_rule_versions" ADD COLUMN "card_id" UUID;

-- Todas as versões existentes ficam com a forma de pagamento atual da regra.
UPDATE "recurring_rule_versions" AS v
SET "card_id" = r."card_id"
FROM "recurring_rules" AS r
WHERE v."rule_id" = r."id" AND r."card_id" IS NOT NULL;

ALTER TABLE "recurring_rule_versions"
  ADD CONSTRAINT "recurring_rule_versions_card_id_fkey"
  FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
