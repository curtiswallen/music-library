ALTER TABLE artists ADD COLUMN aliases TEXT NOT NULL DEFAULT '[]';
ALTER TABLE artists ADD COLUMN disambiguation TEXT;

CREATE TABLE artist_members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_mbid TEXT NOT NULL,
  person_mbid TEXT NOT NULL,
  person_name TEXT NOT NULL,
  role        TEXT NOT NULL,
  instruments TEXT NOT NULL DEFAULT '[]',
  begin_year  TEXT,
  end_year    TEXT,
  is_active   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(artist_mbid, person_mbid, role)
);

CREATE INDEX idx_artist_members_person ON artist_members(person_mbid);
CREATE INDEX idx_artist_members_artist ON artist_members(artist_mbid);
