-- Add theme_preference column to user_profiles
-- Allows per-user light/dark preference, default light
-- ROLLBACK: ALTER TABLE user_profiles DROP COLUMN theme_preference;

ALTER TABLE user_profiles
  ADD COLUMN theme_preference VARCHAR(5) DEFAULT 'light'
    CHECK (theme_preference IN ('light', 'dark'));

-- Allow users to update their own theme preference
-- (other UPDATE scenarios go through admin/service role endpoints)
DROP POLICY IF EXISTS "user_profiles_own_theme_update" ON user_profiles;
CREATE POLICY "user_profiles_own_theme_update" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
