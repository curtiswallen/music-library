ALTER TABLE albums ADD COLUMN search_text TEXT NOT NULL DEFAULT '';

-- 62 replacements, 62 REPLACE( openings (8×7 + 6 = 62)
UPDATE albums SET search_text = LOWER(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    artist || ' ' || album,
    'á','a'), 'Á','a'), 'à','a'), 'À','a'), 'â','a'), 'Â','a'), 'ä','a'), 'Ä','a'),
    'ã','a'), 'Ã','a'), 'å','a'), 'Å','a'), 'æ','ae'), 'Æ','ae'),
    'é','e'), 'É','e'), 'è','e'), 'È','e'), 'ê','e'), 'Ê','e'), 'ë','e'), 'Ë','e'),
    'í','i'), 'Í','i'), 'ì','i'), 'Ì','i'), 'î','i'), 'Î','i'), 'ï','i'), 'Ï','i'),
    'ó','o'), 'Ó','o'), 'ò','o'), 'Ò','o'), 'ô','o'), 'Ô','o'), 'ö','o'), 'Ö','o'),
    'õ','o'), 'Õ','o'), 'ø','o'), 'Ø','o'),
    'ú','u'), 'Ú','u'), 'ù','u'), 'Ù','u'), 'û','u'), 'Û','u'), 'ü','u'), 'Ü','u'),
    'ý','y'), 'Ý','y'), 'ÿ','y'),
    'ñ','n'), 'Ñ','n'),
    'ç','c'), 'Ç','c'),
    'ß','ss'),
    'œ','oe'), 'Œ','oe'), 'ð','d'), 'Ð','d')
);
