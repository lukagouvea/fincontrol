-- CreateTable
CREATE TABLE "investment_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "default_monthly_amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "investment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "investment_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investment_settings_user_id_key" ON "investment_settings"("user_id");

-- CreateIndex
CREATE INDEX "idx_investment_override_user_month" ON "investment_overrides"("user_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "unique_investment_override" ON "investment_overrides"("user_id", "year", "month");

-- AddForeignKey
ALTER TABLE "investment_settings" ADD CONSTRAINT "investment_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "investment_overrides" ADD CONSTRAINT "investment_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
