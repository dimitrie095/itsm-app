DO $$
BEGIN
  IF to_regclass('public.assets') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "assets_userId_idx" ON "assets"("userId")';
  END IF;

  IF to_regclass('public.comments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "comments_ticketId_idx" ON "comments"("ticketId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "comments_userId_idx" ON "comments"("userId")';
  END IF;

  IF to_regclass('public.knowledge_base_articles') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "knowledge_base_articles_authorId_idx" ON "knowledge_base_articles"("authorId")';
  END IF;

  IF to_regclass('public.tickets') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "tickets_userId_idx" ON "tickets"("userId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "tickets_assignedToId_idx" ON "tickets"("assignedToId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "tickets_assetId_idx" ON "tickets"("assetId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "tickets_slaId_idx" ON "tickets"("slaId")';
  END IF;
END $$;
