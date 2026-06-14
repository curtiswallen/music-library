-- Multi-user migration: preserve existing album data, introduce new schema.
-- Run: npx wrangler d1 execute music-library --local --file=./migrations/0002_multiuser.sql

-- 1. Back up existing albums table
ALTER TABLE albums RENAME TO albums_v1;

-- 2. Create new canonical albums table (no subjective fields)
CREATE TABLE albums (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid       TEXT UNIQUE,
  slug       TEXT UNIQUE NOT NULL DEFAULT '',
  artist     TEXT NOT NULL,
  album      TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT '',
  year       INTEGER,
  cover_url  TEXT,
  tracks     TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Copy canonical data; use numeric id as temporary slug (setup endpoint fixes these)
INSERT INTO albums (id, mbid, slug, artist, album, country, year, cover_url, tracks, created_at)
SELECT id, mbid, CAST(id AS TEXT), artist, album, country, year, cover_url, tracks, created_at
FROM albums_v1;

-- 4. Create users table
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id  TEXT UNIQUE NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  username   TEXT NOT NULL,
  avatar_url TEXT,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Create sessions table
CREATE TABLE user_sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- 6. Create per-user library entries table
--    Note: genre/subgenres/rating/notes/recommended/tracks_data left empty here;
--    the admin setup endpoint (POST /api/admin/setup) copies them from albums_v1
--    after the first user is created via Google OAuth.
CREATE TABLE user_albums (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id    INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  genre       TEXT NOT NULL DEFAULT '',
  subgenres   TEXT NOT NULL DEFAULT '[]',
  rating      INTEGER CHECK (rating IS NULL OR (rating BETWEEN 0 AND 100)),
  notes       TEXT NOT NULL DEFAULT '',
  tracks_data TEXT NOT NULL DEFAULT '[]',
  recommended INTEGER NOT NULL DEFAULT 0,
  added_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, album_id)
);

-- 7. Social follows
CREATE TABLE follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, followee_id)
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_albums_artist     ON albums (artist COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_albums_slug       ON albums (slug);
CREATE INDEX IF NOT EXISTS idx_albums_year       ON albums (year);
CREATE INDEX IF NOT EXISTS idx_user_albums_user  ON user_albums (user_id);
CREATE INDEX IF NOT EXISTS idx_user_albums_album ON user_albums (album_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON user_sessions (expires_at);
