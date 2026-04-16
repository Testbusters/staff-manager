-- Migration 073: index FK community_id on tickets, corsi, documents
-- Backlog: DB13, DB14, DB15
-- Rationale: these three FK columns (→ communities.id) have no index.
-- Any query filtering by community_id on these tables requires a full
-- sequential scan. Adding btree indexes enables indexed lookups for
-- community-scoped queries and RLS policy joins.
--
-- ROLLBACK:
--   DROP INDEX CONCURRENTLY IF EXISTS tickets_community_id_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS corsi_community_id_idx;
--   DROP INDEX CONCURRENTLY IF EXISTS documents_community_id_idx;

CREATE INDEX IF NOT EXISTS tickets_community_id_idx
  ON public.tickets (community_id);

CREATE INDEX IF NOT EXISTS corsi_community_id_idx
  ON public.corsi (community_id);

CREATE INDEX IF NOT EXISTS documents_community_id_idx
  ON public.documents (community_id);
