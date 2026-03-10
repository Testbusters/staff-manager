-- ROLLBACK: ALTER TABLE collaborator_communities DROP CONSTRAINT collaborator_communities_collaborator_id_key;

-- Step 1: remove duplicate community assignments (keep first by created_at)
DELETE FROM collaborator_communities
WHERE id NOT IN (
  SELECT DISTINCT ON (collaborator_id) id
  FROM collaborator_communities
  ORDER BY collaborator_id, id ASC
);

-- Step 2: add unique constraint
ALTER TABLE collaborator_communities
  ADD CONSTRAINT collaborator_communities_collaborator_id_key UNIQUE (collaborator_id);
