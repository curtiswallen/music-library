ALTER TABLE descriptors ADD COLUMN is_canonical INTEGER NOT NULL DEFAULT 0;

-- Seed the curated canonical list.
-- ON CONFLICT promotes any pre-existing user-entered entry to canonical too.
INSERT INTO descriptors (name, is_canonical) VALUES
  ('abrasive',       1), ('accessible',    1), ('angular',        1),
  ('anxious',        1), ('atmospheric',   1), ('bleak',          1),
  ('brooding',       1), ('cathartic',     1), ('cerebral',       1),
  ('chaotic',        1), ('cinematic',     1), ('claustrophobic', 1),
  ('dark',           1), ('dense',         1), ('dissonant',      1),
  ('driving',        1), ('energetic',     1), ('epic',           1),
  ('ethereal',       1), ('euphoric',      1), ('experimental',   1),
  ('frenetic',       1), ('groovy',        1), ('heavy',          1),
  ('hopeful',        1), ('hypnotic',      1), ('improvisational',1),
  ('introspective',  1), ('intimate',      1), ('layered',        1),
  ('lofi',           1), ('maximalist',    1), ('meditative',     1),
  ('melancholic',    1), ('melodic',       1), ('minimalist',     1),
  ('nostalgic',      1), ('ominous',       1), ('overproduced',   1),
  ('playful',        1), ('polished',      1), ('progressive',    1),
  ('pulsating',      1), ('raw',           1), ('restless',       1),
  ('serene',         1), ('sluggish',      1), ('sorrowful',      1),
  ('sparse',         1), ('technical',     1), ('triumphant',     1),
  ('uplifting',      1), ('warm',          1)
ON CONFLICT(name) DO UPDATE SET is_canonical = 1;
