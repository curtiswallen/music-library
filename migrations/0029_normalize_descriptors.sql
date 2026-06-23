-- Normalize hyphenated descriptor variants to canonical non-hyphenated forms.
-- UPDATE OR IGNORE handles the case where a canonical row already exists for
-- the same (album_id, user_id) — the conflict is silently skipped, then the
-- DELETE below removes the now-duplicate hyphenated row.

UPDATE OR IGNORE user_album_descriptors SET descriptor = 'lofi'  WHERE descriptor = 'lo-fi';
DELETE FROM user_album_descriptors                                WHERE descriptor = 'lo-fi';

-- Remove the old hyphenated entry from the descriptors lookup table too
DELETE FROM descriptors WHERE name = 'lo-fi';
