CREATE INDEX IF NOT EXISTS idx_ua_hidden_added ON user_albums(is_hidden, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_ua_album_rating  ON user_albums(album_id, rating DESC);
