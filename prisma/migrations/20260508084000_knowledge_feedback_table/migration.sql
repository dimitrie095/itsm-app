CREATE TABLE IF NOT EXISTS "knowledge_article_feedback" (
  "id" TEXT PRIMARY KEY,
  "article_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "user_id" TEXT,
  "user_name" TEXT,
  "user_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "knowledge_article_feedback_article_id_idx"
  ON "knowledge_article_feedback" ("article_id");

CREATE INDEX IF NOT EXISTS "knowledge_article_feedback_article_user_type_idx"
  ON "knowledge_article_feedback" ("article_id", "user_id", "type");

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_article_feedback_helpful_unique_idx"
  ON "knowledge_article_feedback" ("article_id", "user_id")
  WHERE "type" = 'HELPFUL' AND "user_id" IS NOT NULL;
