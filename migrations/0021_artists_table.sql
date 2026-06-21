CREATE TABLE artists (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid               TEXT UNIQUE NOT NULL,
  name               TEXT NOT NULL,
  inception          TEXT,
  dissolution        TEXT,
  formation_location TEXT,
  logo_url           TEXT,
  wiki_blurb         TEXT,
  wiki_url           TEXT,
  members_data       TEXT NOT NULL DEFAULT '{}',
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_artists_mbid ON artists (mbid);
