CREATE TABLE IF NOT EXISTS "reports_store" (
  "id" TEXT PRIMARY KEY,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "reports_store_updated_at_idx"
  ON "reports_store" ("updated_at" DESC);
