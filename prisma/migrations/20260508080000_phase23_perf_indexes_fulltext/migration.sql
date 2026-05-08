-- Phase 3 performance indexes
CREATE INDEX IF NOT EXISTS "tickets_status_createdAt_idx"
  ON "tickets" ("status", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "tickets_priority_createdAt_idx"
  ON "tickets" ("priority", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "tickets_status_resolvedAt_idx"
  ON "tickets" ("status", "resolvedAt" DESC);

CREATE INDEX IF NOT EXISTS "knowledge_base_articles_isPublished_createdAt_idx"
  ON "knowledge_base_articles" ("isPublished", "createdAt" DESC);

-- Fulltext search for tickets
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_search_vector_update ON "tickets";
CREATE TRIGGER ticket_search_vector_update
BEFORE INSERT OR UPDATE OF "title", "description"
ON "tickets"
FOR EACH ROW
EXECUTE FUNCTION update_ticket_search_vector();

UPDATE "tickets"
SET "search_vector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B')
WHERE "search_vector" IS NULL;

CREATE INDEX IF NOT EXISTS "tickets_search_vector_idx"
  ON "tickets"
  USING GIN ("search_vector");
