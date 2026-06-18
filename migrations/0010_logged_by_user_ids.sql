ALTER TABLE albums ADD COLUMN logged_by_user_ids TEXT NOT NULL DEFAULT '[]';

UPDATE albums SET logged_by_user_ids = (
  SELECT json_group_array(user_id) FROM user_albums WHERE album_id = albums.id
);
