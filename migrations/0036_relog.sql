ALTER TABLE user_albums ADD COLUMN logged_at TEXT;
UPDATE user_albums SET logged_at = added_at WHERE rating IS NOT NULL;

CREATE TABLE user_album_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  album_id    INTEGER NOT NULL,
  rating      INTEGER,
  genre       TEXT    NOT NULL DEFAULT '',
  subgenres   TEXT    NOT NULL DEFAULT '[]',
  descriptors TEXT    NOT NULL DEFAULT '[]',
  notes       TEXT    NOT NULL DEFAULT '',
  recommended INTEGER NOT NULL DEFAULT 0,
  logged_at   TEXT    NOT NULL
);
CREATE INDEX idx_user_album_logs ON user_album_logs(user_id, album_id, logged_at DESC);
