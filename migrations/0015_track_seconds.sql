-- Cache per-album listening time so dashboard stats stay cheap
ALTER TABLE user_albums ADD COLUMN track_seconds INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing albums.tracks JSON
UPDATE user_albums
SET track_seconds = (
  SELECT COALESCE(SUM(
    CASE
      WHEN json_extract(t.value, '$.length') IS NOT NULL
       AND CAST(json_extract(t.value, '$.length') AS INTEGER) > 0
      THEN CAST(json_extract(t.value, '$.length') AS INTEGER)
      ELSE 0
    END
  ), 0)
  FROM albums a,
       json_each(CASE
         WHEN a.tracks IS NULL OR a.tracks = '' OR a.tracks = 'null' OR a.tracks = '[]'
         THEN '[]'
         ELSE a.tracks
       END) AS t
  WHERE a.id = user_albums.album_id
);
