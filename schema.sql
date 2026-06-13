CREATE TABLE IF NOT EXISTS albums (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mbid         TEXT,
  artist       TEXT NOT NULL,
  album        TEXT NOT NULL,
  country      TEXT    NOT NULL DEFAULT '',
  year         INTEGER,
  genre        TEXT    NOT NULL DEFAULT '',
  subgenres    TEXT    NOT NULL DEFAULT '[]',
  rating       INTEGER CHECK (rating IS NULL OR (rating BETWEEN 0 AND 100)),
  notes        TEXT    NOT NULL DEFAULT '',
  fav_tracks   TEXT    NOT NULL DEFAULT '[]',
  recommended  INTEGER NOT NULL DEFAULT 0,
  cover_url    TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums (artist COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_albums_genre  ON albums (genre);
CREATE INDEX IF NOT EXISTS idx_albums_rating ON albums (rating);
CREATE INDEX IF NOT EXISTS idx_albums_year   ON albums (year);
