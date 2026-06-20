ALTER TABLE albums ADD COLUMN genre_counts      TEXT NOT NULL DEFAULT '{}';
ALTER TABLE albums ADD COLUMN subgenre_counts   TEXT NOT NULL DEFAULT '{}';
ALTER TABLE albums ADD COLUMN descriptor_counts TEXT NOT NULL DEFAULT '{}';
ALTER TABLE albums ADD COLUMN avg_rating        REAL;
ALTER TABLE albums ADD COLUMN rating_count      INTEGER NOT NULL DEFAULT 0;

UPDATE albums SET
  genre_counts = COALESCE(
    (SELECT json_group_object(genre, cnt)
     FROM (SELECT genre, COUNT(*) as cnt FROM user_albums WHERE album_id = albums.id AND genre != '' GROUP BY genre)),
    '{}'
  ),
  subgenre_counts = COALESCE(
    (SELECT json_group_object(value, cnt)
     FROM (SELECT value, COUNT(*) as cnt FROM user_albums, json_each(user_albums.subgenres) WHERE user_albums.album_id = albums.id GROUP BY value)),
    '{}'
  ),
  descriptor_counts = COALESCE(
    (SELECT json_group_object(value, cnt)
     FROM (SELECT value, COUNT(*) as cnt FROM user_albums, json_each(user_albums.descriptors) WHERE user_albums.album_id = albums.id GROUP BY value)),
    '{}'
  ),
  avg_rating   = (SELECT AVG(rating)   FROM user_albums WHERE album_id = albums.id AND rating IS NOT NULL),
  rating_count = (SELECT COUNT(rating) FROM user_albums WHERE album_id = albums.id AND rating IS NOT NULL);
