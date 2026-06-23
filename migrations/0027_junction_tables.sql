-- Replace O(N·json_each) aggregation with indexed junction tables for subgenres/descriptors.
-- Also adds indexes for the public-album subquery and genre similarity lookup.

CREATE TABLE user_album_subgenres (
  album_id  INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  subgenre  TEXT    NOT NULL,
  PRIMARY KEY (album_id, user_id, subgenre)
);

CREATE TABLE user_album_descriptors (
  album_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  descriptor TEXT    NOT NULL,
  PRIMARY KEY (album_id, user_id, descriptor)
);

-- Covers the similar-albums EXISTS subquery: WHERE album_id = ? AND genre = ?
CREATE INDEX IF NOT EXISTS idx_ua_album_genre ON user_albums(album_id, genre);

-- Covers the public-album IN subquery: WHERE is_hidden = 0 (leading) → album_id
CREATE INDEX IF NOT EXISTS idx_ua_public_albums ON user_albums(is_hidden, album_id);

-- Backfill from existing JSON arrays
INSERT OR IGNORE INTO user_album_subgenres (album_id, user_id, subgenre)
SELECT ua.album_id, ua.user_id, t.value
FROM user_albums ua, json_each(ua.subgenres) t
WHERE ua.subgenres IS NOT NULL AND ua.subgenres != '[]';

INSERT OR IGNORE INTO user_album_descriptors (album_id, user_id, descriptor)
SELECT ua.album_id, ua.user_id, t.value
FROM user_albums ua, json_each(ua.descriptors) t
WHERE ua.descriptors IS NOT NULL AND ua.descriptors != '[]';
