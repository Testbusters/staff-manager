-- Migration 052: add banner columns to communities table
-- Rollback: ALTER TABLE communities DROP COLUMN banner_content, DROP COLUMN banner_active, DROP COLUMN banner_link_url, DROP COLUMN banner_link_label, DROP COLUMN banner_updated_at;

ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS banner_content    TEXT,
  ADD COLUMN IF NOT EXISTS banner_active     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_link_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_link_label TEXT,
  ADD COLUMN IF NOT EXISTS banner_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
