-- Migration 067: Add invite_email_sent tracking to user_profiles
-- and backfill must_change_password in auth.users.raw_app_meta_data

-- 1. Add invite_email_sent column
ALTER TABLE public.user_profiles
  ADD COLUMN invite_email_sent BOOLEAN NOT NULL DEFAULT false;

-- 2. Data repair: propagate must_change_password to auth metadata
-- for users that have must_change_password=true in user_profiles
-- but lack the key in raw_app_meta_data
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb
WHERE id IN (
  SELECT user_id FROM public.user_profiles WHERE must_change_password = true
)
AND (
  raw_app_meta_data IS NULL
  OR NOT (raw_app_meta_data ? 'must_change_password')
  OR (raw_app_meta_data->>'must_change_password')::boolean IS DISTINCT FROM true
);
