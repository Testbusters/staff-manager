-- Change theme_preference default from 'light' to 'dark'
ALTER TABLE user_profiles ALTER COLUMN theme_preference SET DEFAULT 'dark';
