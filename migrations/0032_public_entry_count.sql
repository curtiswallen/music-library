ALTER TABLE albums ADD COLUMN public_entry_count INTEGER NOT NULL DEFAULT 0;

UPDATE albums SET
  public_entry_count = (
    SELECT COUNT(*)
    FROM user_albums ua
    JOIN users u ON u.id = ua.user_id AND u.is_private = 0
    WHERE ua.album_id = albums.id AND ua.is_hidden = 0
  );
