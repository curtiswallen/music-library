ALTER TABLE users ADD COLUMN total_seconds INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET total_seconds = COALESCE(
  (SELECT SUM(track_seconds) FROM user_albums WHERE user_id = users.id),
  0
);
