-- Normalize descriptors lookup table
UPDATE descriptors SET name = lower(name);

-- Normalize per-user descriptor JSON arrays (deduplicate after lowercasing)
UPDATE user_albums SET descriptors = (
  SELECT json_group_array(value)
  FROM (SELECT DISTINCT lower(value) AS value FROM json_each(user_albums.descriptors))
)
WHERE descriptors != '[]';

-- Recompute albums.all_descriptors from the now-clean user_albums data
UPDATE albums SET all_descriptors = COALESCE(
  (SELECT json_group_array(value)
   FROM (SELECT DISTINCT value FROM user_albums, json_each(user_albums.descriptors)
         WHERE user_albums.album_id = albums.id)),
  '[]'
);
