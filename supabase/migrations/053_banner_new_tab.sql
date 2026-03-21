-- Migration 053: add banner_link_new_tab option to communities
-- Rollback: ALTER TABLE communities DROP COLUMN banner_link_new_tab;

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS banner_link_new_tab BOOLEAN NOT NULL DEFAULT false;
