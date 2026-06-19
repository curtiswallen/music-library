CREATE INDEX IF NOT EXISTS idx_user_albums_added_at ON user_albums (user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_albums_rating   ON user_albums (user_id, rating DESC);
