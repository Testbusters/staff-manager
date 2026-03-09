ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS skip_contract_on_onboarding BOOLEAN NOT NULL DEFAULT false;
