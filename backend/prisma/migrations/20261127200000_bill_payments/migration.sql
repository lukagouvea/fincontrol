-- Contas a pagar: marcar como paga a ocorrência de uma recorrente À vista e as
-- parcelas À vista (Pix, boleto). Aditiva: nada é apagado.

-- O que venceu antes deste mês conta como pago (contas existentes: mês do
-- deploy; contas novas: mês do cadastro). Só daqui em diante pede marcação.
ALTER TABLE "users" ADD COLUMN "payments_tracked_from" DATE NOT NULL DEFAULT (date_trunc('month', now()))::date;

-- Parcela À vista paga (null = ainda não marcada).
ALTER TABLE "transactions" ADD COLUMN "paid_at" TIMESTAMP(6);

-- Ocorrências de recorrentes não ficam gravadas; o pagamento é por regra e mês.
CREATE TABLE "recurring_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "rule_id" UUID NOT NULL,
  "month" DATE NOT NULL,
  "paid_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recurring_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "unique_recurring_payment_month" ON "recurring_payments"("rule_id", "month");
CREATE INDEX "idx_recurring_payments_user" ON "recurring_payments"("user_id");
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "recurring_rules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
