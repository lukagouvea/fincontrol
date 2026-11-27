-- Virada de mês (fase 3f): último mês fechado cujo aviso já foi visto.
ALTER TABLE "users" ADD COLUMN "last_closing_seen" VARCHAR(7);
ALTER TABLE "users" ADD CONSTRAINT "users_last_closing_seen_format" CHECK ("last_closing_seen" IS NULL OR "last_closing_seen" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
