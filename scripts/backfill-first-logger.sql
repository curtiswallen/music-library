-- For albums with multiple logged users, the one with the earliest added_at wins.
-- Queued-only entries (is_queued = 1) are excluded — only actual logs count.

UPDATE albums
SET first_logged_by_user_id = (
  SELECT ua.user_id
  FROM user_albums ua
  WHERE ua.album_id = albums.id
    AND (ua.is_queued = 0 OR ua.is_queued IS NULL)
  ORDER BY ua.added_at ASC
  LIMIT 1
)
WHERE first_logged_by_user_id IS NULL;

UPDATE users
SET first_logs_count = (
  SELECT COUNT(*)
  FROM albums a
  WHERE a.first_logged_by_user_id = users.id
);
