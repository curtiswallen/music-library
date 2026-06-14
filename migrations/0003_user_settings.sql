-- User profile settings + per-album privacy
-- Run: npx wrangler d1 execute music-library --local --file=./migrations/0003_user_settings.sql

ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN profile_url  TEXT;
ALTER TABLE users ADD COLUMN is_private   INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_albums ADD COLUMN is_hidden INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_profile_url ON users (profile_url);
CREATE INDEX IF NOT EXISTS idx_user_albums_hidden ON user_albums (user_id, is_hidden);
