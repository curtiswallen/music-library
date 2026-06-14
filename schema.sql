-- ── Canonical album facts (shared across all users) ──────────────────────────
CREATE TABLE IF NOT EXISTS albums (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid       TEXT UNIQUE,
  slug       TEXT UNIQUE NOT NULL,
  artist     TEXT NOT NULL,
  album      TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT '',
  year       INTEGER,
  cover_url  TEXT,
  tracks     TEXT NOT NULL DEFAULT '[]',  -- JSON: [{pos, title, length}]
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Users (Google OAuth) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id    TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  username     TEXT NOT NULL,
  display_name TEXT,
  profile_url  TEXT UNIQUE,
  is_private   INTEGER NOT NULL DEFAULT 0,
  avatar_url   TEXT,
  is_admin     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id         TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

-- ── Per-user library entries (subjective / personal data) ─────────────────────
CREATE TABLE IF NOT EXISTS user_albums (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  album_id    INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  genre       TEXT NOT NULL DEFAULT '',
  subgenres   TEXT NOT NULL DEFAULT '[]',    -- JSON: string[]
  rating      INTEGER CHECK (rating IS NULL OR (rating BETWEEN 0 AND 100)),
  notes       TEXT NOT NULL DEFAULT '',
  tracks_data TEXT NOT NULL DEFAULT '[]',    -- JSON: [{pos, rating, notable, note}]
  recommended INTEGER NOT NULL DEFAULT 0,
  is_hidden   INTEGER NOT NULL DEFAULT 0,
  added_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, album_id)
);

-- ── Social follows (asymmetric) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, followee_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_albums_artist     ON albums (artist COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_albums_slug       ON albums (slug);
CREATE INDEX IF NOT EXISTS idx_albums_year       ON albums (year);
CREATE INDEX IF NOT EXISTS idx_user_albums_user  ON user_albums (user_id);
CREATE INDEX IF NOT EXISTS idx_user_albums_album ON user_albums (album_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user     ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON user_sessions (expires_at);
