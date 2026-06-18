ALTER TABLE albums ADD COLUMN all_subgenres  TEXT NOT NULL DEFAULT '[]';
ALTER TABLE albums ADD COLUMN all_descriptors TEXT NOT NULL DEFAULT '[]';

UPDATE albums SET
  all_subgenres = COALESCE(
    (SELECT json_group_array(value)
     FROM (SELECT DISTINCT value
           FROM user_albums, json_each(user_albums.subgenres)
           WHERE user_albums.album_id = albums.id)),
    '[]'
  ),
  all_descriptors = COALESCE(
    (SELECT json_group_array(value)
     FROM (SELECT DISTINCT value
           FROM user_albums, json_each(user_albums.descriptors)
           WHERE user_albums.album_id = albums.id)),
    '[]'
  );
