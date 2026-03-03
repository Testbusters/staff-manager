-- ROLLBACK:
--   ALTER TABLE communications ADD COLUMN community_id UUID REFERENCES communities(id);
--   UPDATE communications SET community_id = community_ids[1] WHERE array_length(community_ids,1) = 1;
--   ALTER TABLE communications DROP COLUMN community_ids;
--   (same for events, opportunities, discounts, resources)

-- Replace single community_id FK with community_ids UUID[] on all content tables.
-- community_ids = '{}' means "all communities" (visible to everyone).
-- Backfill: existing community_id IS NOT NULL → ARRAY[community_id], NULL → '{}'.

-- ── communications ────────────────────────────────────────────────────────────
ALTER TABLE communications ADD COLUMN community_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE communications SET community_ids = ARRAY[community_id] WHERE community_id IS NOT NULL;
ALTER TABLE communications DROP COLUMN community_id;

-- ── events ───────────────────────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN community_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE events SET community_ids = ARRAY[community_id] WHERE community_id IS NOT NULL;
ALTER TABLE events DROP COLUMN community_id;

-- ── opportunities ─────────────────────────────────────────────────────────────
ALTER TABLE opportunities ADD COLUMN community_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE opportunities SET community_ids = ARRAY[community_id] WHERE community_id IS NOT NULL;
ALTER TABLE opportunities DROP COLUMN community_id;

-- ── discounts ─────────────────────────────────────────────────────────────────
ALTER TABLE discounts ADD COLUMN community_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE discounts SET community_ids = ARRAY[community_id] WHERE community_id IS NOT NULL;
ALTER TABLE discounts DROP COLUMN community_id;

-- ── resources ─────────────────────────────────────────────────────────────────
ALTER TABLE resources ADD COLUMN community_ids UUID[] NOT NULL DEFAULT '{}';
UPDATE resources SET community_ids = ARRAY[community_id] WHERE community_id IS NOT NULL;
ALTER TABLE resources DROP COLUMN community_id;
