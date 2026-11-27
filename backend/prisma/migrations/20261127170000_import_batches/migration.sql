-- Importação de extrato (fase 3h).

CREATE TABLE "import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "card_id" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "import_batches_count_positive" CHECK ("count" > 0)
);

ALTER TABLE "transactions" ADD COLUMN "import_batch_id" UUID;

CREATE INDEX "idx_import_batches_user" ON "import_batches"("user_id");
CREATE INDEX "idx_transactions_import_batch" ON "transactions"("import_batch_id");

ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
