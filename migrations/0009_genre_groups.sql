ALTER TABLE genres ADD COLUMN genre_group TEXT;

UPDATE genres SET genre_group = 'Metal' WHERE name IN (
  'Black Metal','Death Metal','Black/Death','Doom Metal','Thrash Metal',
  'Speed Metal','Heavy Metal','Power Metal','Progressive Metal','Post-Metal',
  'Folk Metal','Gothic Metal','Grindcore','Industrial Metal','Sludge Metal',
  'Alternative Metal','Metalcore','Deathcore','Stoner Rock'
);
UPDATE genres SET genre_group = 'Rock & Punk' WHERE name IN (
  'Rock','Post-Rock','Noise Rock','Shoegaze','Post-Punk','Punk'
);
UPDATE genres SET genre_group = 'Pop & Country' WHERE name IN ('Pop','Country');
UPDATE genres SET genre_group = 'Electronic' WHERE name IN (
  'Electronic','Ambient','Darkwave','Neofolk'
);
UPDATE genres SET genre_group = 'Hip-Hop, R&B & Reggae' WHERE name IN (
  'Hip-Hop / Rap','R&B / Soul','Reggae'
);
UPDATE genres SET genre_group = 'Folk, Blues & Jazz' WHERE name IN (
  'Jazz','Classical','Blues','Folk'
);
UPDATE genres SET genre_group = 'World & Experimental' WHERE name IN (
  'World Music','Experimental'
);
