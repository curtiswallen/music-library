CREATE TABLE IF NOT EXISTS genres (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE NOT NULL COLLATE NOCASE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subgenres (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_id   INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  name       TEXT NOT NULL COLLATE NOCASE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(genre_id, name)
);

-- Seed genres
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Black Metal', 10);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Death Metal', 20);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Black/Death', 30);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Doom Metal', 40);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Thrash Metal', 50);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Speed Metal', 60);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Heavy Metal', 70);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Power Metal', 80);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Progressive Metal', 90);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Post-Metal', 100);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Folk Metal', 110);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Gothic Metal', 120);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Grindcore', 130);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Industrial Metal', 140);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Sludge Metal', 150);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Alternative Metal', 160);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Metalcore', 170);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Deathcore', 180);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Stoner Rock', 190);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Rock', 200);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Post-Rock', 210);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Noise Rock', 220);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Shoegaze', 230);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Post-Punk', 240);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Punk', 250);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Pop', 260);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Country', 270);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Electronic', 280);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Ambient', 290);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Darkwave', 300);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Neofolk', 310);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Hip-Hop / Rap', 320);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('R&B / Soul', 330);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Reggae', 340);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Jazz', 350);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Classical', 360);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Blues', 370);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Folk', 380);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('World Music', 390);
INSERT OR IGNORE INTO genres (name, sort_order) VALUES ('Experimental', 400);

-- Black Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Sketchy' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Melodic' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Raw' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Atmospheric' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Symphonic' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Depressive' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'DSBM' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Folk' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Viking' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Pagan' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Ambient' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Industrial' FROM genres WHERE name = 'Black Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blackgaze' FROM genres WHERE name = 'Black Metal';

-- Death Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Technical' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Brutal' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Melodic' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Death/Doom' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Progressive' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blackened' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Slam' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Deathgrind' FROM genres WHERE name = 'Death Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Old School' FROM genres WHERE name = 'Death Metal';

-- Black/Death subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blackened' FROM genres WHERE name = 'Black/Death';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'War Metal' FROM genres WHERE name = 'Black/Death';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Bestial' FROM genres WHERE name = 'Black/Death';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blasphemic' FROM genres WHERE name = 'Black/Death';

-- Doom Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Traditional' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Funeral' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Atmospheric' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Sludge' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Stoner' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Death/Doom' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Gothic' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Epic' FROM genres WHERE name = 'Doom Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Drone' FROM genres WHERE name = 'Doom Metal';

-- Thrash Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Bay Area' FROM genres WHERE name = 'Thrash Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'German' FROM genres WHERE name = 'Thrash Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Technical' FROM genres WHERE name = 'Thrash Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Crossover' FROM genres WHERE name = 'Thrash Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blackened' FROM genres WHERE name = 'Thrash Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Speed' FROM genres WHERE name = 'Thrash Metal';

-- Speed Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'NWOBHM' FROM genres WHERE name = 'Speed Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Thrash-Adjacent' FROM genres WHERE name = 'Speed Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Heavy/Speed' FROM genres WHERE name = 'Speed Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Power/Speed' FROM genres WHERE name = 'Speed Metal';

-- Heavy Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'NWOBHM' FROM genres WHERE name = 'Heavy Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Traditional' FROM genres WHERE name = 'Heavy Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Epic' FROM genres WHERE name = 'Heavy Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Speed' FROM genres WHERE name = 'Heavy Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Power' FROM genres WHERE name = 'Heavy Metal';

-- Power Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Symphonic' FROM genres WHERE name = 'Power Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Progressive' FROM genres WHERE name = 'Power Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Folk' FROM genres WHERE name = 'Power Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Epic' FROM genres WHERE name = 'Power Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Speed' FROM genres WHERE name = 'Power Metal';

-- Progressive Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Djent' FROM genres WHERE name = 'Progressive Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Technical' FROM genres WHERE name = 'Progressive Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Atmospheric' FROM genres WHERE name = 'Progressive Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Jazz-Influenced' FROM genres WHERE name = 'Progressive Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Math Metal' FROM genres WHERE name = 'Progressive Metal';

-- Post-Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Atmospheric' FROM genres WHERE name = 'Post-Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Sludge' FROM genres WHERE name = 'Post-Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Rock Influenced' FROM genres WHERE name = 'Post-Metal';

-- Folk Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Pagan' FROM genres WHERE name = 'Folk Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Viking' FROM genres WHERE name = 'Folk Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Celtic' FROM genres WHERE name = 'Folk Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Medieval' FROM genres WHERE name = 'Folk Metal';

-- Gothic Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Doom/Gothic' FROM genres WHERE name = 'Gothic Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Symphonic' FROM genres WHERE name = 'Gothic Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Romantic' FROM genres WHERE name = 'Gothic Metal';

-- Grindcore subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Goregrind' FROM genres WHERE name = 'Grindcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Powerviolence' FROM genres WHERE name = 'Grindcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Noisecore' FROM genres WHERE name = 'Grindcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Death-Grind' FROM genres WHERE name = 'Grindcore';

-- Industrial Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Electronic' FROM genres WHERE name = 'Industrial Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'EBM' FROM genres WHERE name = 'Industrial Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Noise' FROM genres WHERE name = 'Industrial Metal';

-- Sludge Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Stoner' FROM genres WHERE name = 'Sludge Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Metal' FROM genres WHERE name = 'Sludge Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Southern' FROM genres WHERE name = 'Sludge Metal';

-- Alternative Metal subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Nu-Metal' FROM genres WHERE name = 'Alternative Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Groove' FROM genres WHERE name = 'Alternative Metal';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Grunge' FROM genres WHERE name = 'Alternative Metal';

-- Metalcore subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Melodic' FROM genres WHERE name = 'Metalcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Hardcore' FROM genres WHERE name = 'Metalcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Mathcore' FROM genres WHERE name = 'Metalcore';

-- Deathcore subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Slam' FROM genres WHERE name = 'Deathcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Brutal' FROM genres WHERE name = 'Deathcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Melodic' FROM genres WHERE name = 'Deathcore';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Technical' FROM genres WHERE name = 'Deathcore';

-- Stoner Rock subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Psychedelic' FROM genres WHERE name = 'Stoner Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Fuzz' FROM genres WHERE name = 'Stoner Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Desert Rock' FROM genres WHERE name = 'Stoner Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Southern' FROM genres WHERE name = 'Stoner Rock';

-- Rock subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Classic' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Hard Rock' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Garage' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Psychedelic' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Art Rock' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Indie' FROM genres WHERE name = 'Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Alternative' FROM genres WHERE name = 'Rock';

-- Post-Rock subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Instrumental' FROM genres WHERE name = 'Post-Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Atmospheric' FROM genres WHERE name = 'Post-Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Metal Adjacent' FROM genres WHERE name = 'Post-Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Cinematic' FROM genres WHERE name = 'Post-Rock';

-- Noise Rock subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'No Wave' FROM genres WHERE name = 'Noise Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Sludge' FROM genres WHERE name = 'Noise Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Experimental' FROM genres WHERE name = 'Noise Rock';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Punk Adjacent' FROM genres WHERE name = 'Noise Rock';

-- Shoegaze subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dream Pop' FROM genres WHERE name = 'Shoegaze';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Blackgaze' FROM genres WHERE name = 'Shoegaze';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Lo-Fi' FROM genres WHERE name = 'Shoegaze';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Neo-Shoegaze' FROM genres WHERE name = 'Shoegaze';

-- Post-Punk subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Darkwave' FROM genres WHERE name = 'Post-Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Cold Wave' FROM genres WHERE name = 'Post-Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Goth Rock' FROM genres WHERE name = 'Post-Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'New Wave' FROM genres WHERE name = 'Post-Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Proto-Punk' FROM genres WHERE name = 'Post-Punk';

-- Punk subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Hardcore' FROM genres WHERE name = 'Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Anarcho' FROM genres WHERE name = 'Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Crust' FROM genres WHERE name = 'Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Oi!' FROM genres WHERE name = 'Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Street Punk' FROM genres WHERE name = 'Punk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'D-Beat' FROM genres WHERE name = 'Punk';

-- Pop subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Indie Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Synth-Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Art Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Chamber Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dream Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Electropop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Baroque Pop' FROM genres WHERE name = 'Pop';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Folk Pop' FROM genres WHERE name = 'Pop';

-- Country subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Alt-Country' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Outlaw' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Bluegrass' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Americana' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Classic Country' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Folk Country' FROM genres WHERE name = 'Country';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Cowpunk' FROM genres WHERE name = 'Country';

-- Electronic subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Ambient' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Industrial' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'EBM' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dark Electro' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dungeon Synth' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Synthwave' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Noise' FROM genres WHERE name = 'Electronic';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'IDM' FROM genres WHERE name = 'Electronic';

-- Ambient subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dark Ambient' FROM genres WHERE name = 'Ambient';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Drone' FROM genres WHERE name = 'Ambient';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Isolationism' FROM genres WHERE name = 'Ambient';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Industrial' FROM genres WHERE name = 'Ambient';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'New Age' FROM genres WHERE name = 'Ambient';

-- Darkwave subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Ethereal' FROM genres WHERE name = 'Darkwave';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Coldwave' FROM genres WHERE name = 'Darkwave';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Goth Rock' FROM genres WHERE name = 'Darkwave';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Neoclassical' FROM genres WHERE name = 'Darkwave';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Industrial' FROM genres WHERE name = 'Darkwave';

-- Neofolk subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Apocalyptic Folk' FROM genres WHERE name = 'Neofolk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dark Folk' FROM genres WHERE name = 'Neofolk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Folk Noir' FROM genres WHERE name = 'Neofolk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Military Pop' FROM genres WHERE name = 'Neofolk';

-- Hip-Hop / Rap subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'East Coast' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'West Coast' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Conscious' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Trap' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Boom Bap' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Southern' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Alternative' FROM genres WHERE name = 'Hip-Hop / Rap';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Horrorcore' FROM genres WHERE name = 'Hip-Hop / Rap';

-- R&B / Soul subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Classic Soul' FROM genres WHERE name = 'R&B / Soul';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Neo-Soul' FROM genres WHERE name = 'R&B / Soul';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Funk' FROM genres WHERE name = 'R&B / Soul';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Gospel' FROM genres WHERE name = 'R&B / Soul';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Contemporary R&B' FROM genres WHERE name = 'R&B / Soul';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Motown' FROM genres WHERE name = 'R&B / Soul';

-- Reggae subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Roots' FROM genres WHERE name = 'Reggae';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dancehall' FROM genres WHERE name = 'Reggae';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Ska' FROM genres WHERE name = 'Reggae';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Dub' FROM genres WHERE name = 'Reggae';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Rocksteady' FROM genres WHERE name = 'Reggae';

-- Jazz subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Bebop' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Free Jazz' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Fusion' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Hard Bop' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Modal' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Post-Bop' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Cool Jazz' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Big Band' FROM genres WHERE name = 'Jazz';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Avant-Garde' FROM genres WHERE name = 'Jazz';

-- Classical subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Baroque' FROM genres WHERE name = 'Classical';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Romantic' FROM genres WHERE name = 'Classical';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Contemporary' FROM genres WHERE name = 'Classical';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Minimalist' FROM genres WHERE name = 'Classical';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Chamber' FROM genres WHERE name = 'Classical';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Symphony' FROM genres WHERE name = 'Classical';

-- Blues subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Delta' FROM genres WHERE name = 'Blues';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Chicago' FROM genres WHERE name = 'Blues';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Electric' FROM genres WHERE name = 'Blues';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Country Blues' FROM genres WHERE name = 'Blues';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Boogie' FROM genres WHERE name = 'Blues';

-- Folk subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Singer-Songwriter' FROM genres WHERE name = 'Folk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Freak Folk' FROM genres WHERE name = 'Folk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Indie Folk' FROM genres WHERE name = 'Folk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Celtic' FROM genres WHERE name = 'Folk';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Americana' FROM genres WHERE name = 'Folk';

-- World Music subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'African' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Latin' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Caribbean' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Afrobeat' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Celtic' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Middle Eastern' FROM genres WHERE name = 'World Music';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Asian' FROM genres WHERE name = 'World Music';

-- Experimental subgenres
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Avant-Garde' FROM genres WHERE name = 'Experimental';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Noise' FROM genres WHERE name = 'Experimental';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Free Improvisation' FROM genres WHERE name = 'Experimental';
INSERT OR IGNORE INTO subgenres (genre_id, name) SELECT id, 'Electroacoustic' FROM genres WHERE name = 'Experimental';
