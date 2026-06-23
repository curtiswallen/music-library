CREATE TABLE track_ratings (
  album_id  INTEGER NOT NULL,
  user_id   INTEGER NOT NULL,
  track_pos TEXT    NOT NULL,
  rating    INTEGER NOT NULL,
  PRIMARY KEY (album_id, user_id, track_pos)
);

CREATE INDEX idx_track_ratings_album ON track_ratings(album_id);

-- Backfill from existing tracks_data
INSERT OR IGNORE INTO track_ratings (album_id, user_id, track_pos, rating)
SELECT ua.album_id,
       ua.user_id,
       CAST(json_extract(t.value, '$.pos') AS TEXT),
       CAST(json_extract(t.value, '$.rating') AS INTEGER)
FROM user_albums ua, json_each(ua.tracks_data) t
WHERE ua.tracks_data IS NOT NULL
  AND ua.tracks_data != '[]'
  AND json_extract(t.value, '$.rating') IS NOT NULL;

-- Drop the JSON cache column added in 0025
ALTER TABLE albums DROP COLUMN track_ratings;
