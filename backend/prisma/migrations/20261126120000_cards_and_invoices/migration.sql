-- Cartões de crédito, forma de pagamento e pagamentos de fatura (fase 3a).
-- Tudo que já existe fica como "À vista" (card_id nulo).

-- AlterTable
ALTER TABLE "installment_groups" ADD COLUMN "card_id" UUID;
ALTER TABLE "recurring_rules" ADD COLUMN "card_id" UUID;
ALTER TABLE "transactions" ADD COLUMN "card_id" UUID;

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "credit_limit" DECIMAL(12,2) NOT NULL,
    "closing_day" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT 'verde',
    "archived_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cards_last4_digits" CHECK ("last4" ~ '^[0-9]{4}$'),
    CONSTRAINT "cards_closing_day_range" CHECK ("closing_day" BETWEEN 1 AND 31),
    CONSTRAINT "cards_due_day_range" CHECK ("due_day" BETWEEN 1 AND 31),
    CONSTRAINT "cards_limit_positive" CHECK ("credit_limit" > 0)
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "invoice_month" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invoice_payments_amount_positive" CHECK ("amount" > 0)
);

-- CreateIndex
CREATE INDEX "idx_cards_user" ON "cards"("user_id");
CREATE INDEX "idx_invoice_payments_card_month" ON "invoice_payments"("card_id", "invoice_month");
CREATE INDEX "idx_transactions_card_date" ON "transactions"("card_id", "date");

-- AddForeignKey
ALTER TABLE "installment_groups" ADD CONSTRAINT "installment_groups_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
