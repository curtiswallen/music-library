-- Add per-user option to hide "added at" dates from public views
-- Run: npx wrangler d1 execute music-library --local --file=./migrations/0004_hide_added_at.sql

ALTER TABLE users ADD COLUMN hide_added_at INTEGER NOT NULL DEFAULT 0;
