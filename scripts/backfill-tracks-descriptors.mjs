#!/usr/bin/env node
/**
 * Backfill track listings and clean up descriptors.
 *
 * Phase 1: Track backfill
 *   For every album with an MBID, re-fetch the tracklist from MusicBrainz so
 *   that featured-artist credits are included in track titles (the original
 *   fetch didn't capture them). Albums without an MBID are skipped (manual data).
 *
 * Phase 2: Descriptor cleanup
 *   - Remap known aliases (lo-fi → lofi, etc.)
 *   - Delete any remaining non-canonical entries from user_album_descriptors
 *   - Patch the user_albums.descriptors JSON column to match
 *   - Re-aggregate albums.all_descriptors and albums.descriptor_counts
 *
 * Usage:
 *   node scripts/backfill-tracks-descriptors.mjs              (local D1, both phases)
 *   node scripts/backfill-tracks-descriptors.mjs --remote     (remote D1)
 *   node scripts/backfill-tracks-descriptors.mjs --tracks-only
 *   node scripts/backfill-tracks-descriptors.mjs --descriptors-only
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const REMOTE           = process.argv.includes('--remote');
const TRACKS_ONLY      = process.argv.includes('--tracks-only');
const DESCRIPTORS_ONLY = process.argv.includes('--descriptors-only');
const REMOTE_FLAG      = REMOTE ? '--remote' : '';
const DB_NAME          = 'music-library';

const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1 (backfill)';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function runD1(sql) {
  const tmpFile = join(root, '.backfill-tmp.sql');
  writeFileSync(tmpFile, sql, 'utf8');
  try {
    execSync(
      `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --file="${tmpFile}" --yes`,
      { cwd: root, stdio: 'inherit' }
    );
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
}

function queryD1(sql) {
  const singleLine = sql.replace(/\s+/g, ' ').trim();
  const raw = execSync(
    `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --command "${singleLine}" --json`,
    { cwd: root }
  ).toString();
  const jsonStart = raw.search(/^\[/m);
  const out = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  return JSON.parse(out)[0]?.results ?? [];
}

function esc(v) {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ─── Track fetch logic (mirrors musicbrainz-release.ts) ─────────────────────

async function fetchTracks(rgId) {
  // Step 1: find releases in this release-group
  const rgRes = await fetch(
    `${MB}/release?release-group=${rgId}&fmt=json&limit=10`,
    { headers: HDR }
  );
  if (!rgRes.ok) return null;
  const rgData = await rgRes.json();
  const releases = rgData.releases ?? [];
  if (!releases.length) return null;

  // Prefer "Official" release; fall back to first
  const pick = releases.find(r => r.status === 'Official') ?? releases[0];

  await sleep(1100); // MB rate limit between the two calls

  // Step 2: fetch full tracklist with per-track artist credits
  const relRes = await fetch(
    `${MB}/release/${pick.id}?inc=recordings+artist-credits&fmt=json`,
    { headers: HDR }
  );
  if (!relRes.ok) return null;
  const rel = await relRes.json();

  const isSplit = (rel['artist-credit'] ?? []).length > 1;

  let pos = 0;
  const tracks = (rel.media ?? []).flatMap(m =>
    (m.tracks ?? []).map(t => {
      let title = t.title;
      const ac = t.recording?.['artist-credit'] ?? [];

      if (isSplit) {
        const trackArtist = ac
          .map(c => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? ''))
          .join('').trim();
        if (trackArtist) title = `${trackArtist} - ${title}`;
      } else if (ac.length > 1) {
        // Featured / additional artists: build suffix from joinphrase structure
        // e.g. [{joinphrase: " feat. "}, {name: "Feature", joinphrase: ""}] → " feat. Feature"
        const featSuffix = (ac[0].joinphrase ?? '')
          + ac.slice(1).map(c => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('');
        if (featSuffix.trim()) title = title + featSuffix;
      }

      return {
        pos:    ++pos,
        title,
        length: t.length != null ? Math.round(t.length / 1000) : null,
      };
    })
  );

  return tracks;
}

// ─── Phase 1: Track backfill ─────────────────────────────────────────────────

if (!DESCRIPTORS_ONLY) {
  console.log('\n=== Phase 1: Track backfill ===\n');

  const albums = queryD1(`
    SELECT id, mbid, artist FROM albums
    WHERE mbid IS NOT NULL
    ORDER BY id
  `);

  console.log(`Found ${albums.length} albums with MBIDs.\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const row of albums) {
    console.log(`  [${row.id}] ${row.artist} — fetching tracks for rg=${row.mbid} …`);
    try {
      const tracks = await fetchTracks(row.mbid);
      if (!tracks || tracks.length === 0) {
        console.log('    → no tracks returned, skipping');
        skipped++;
      } else {
        const json = JSON.stringify(tracks);
        runD1(`UPDATE albums SET tracks = ${esc(json)} WHERE id = ${row.id};`);
        console.log(`    → updated ${tracks.length} tracks`);
        updated++;
      }
    } catch (err) {
      console.error(`    → error: ${err.message}`);
      failed++;
    }

    await sleep(1100); // first of two calls; fetchTracks sleeps internally for the second
  }

  console.log(`\nPhase 1 complete. Updated=${updated}, Skipped=${skipped}, Failed=${failed}\n`);
}

// ─── Phase 2: Descriptor cleanup ─────────────────────────────────────────────

if (!TRACKS_ONLY) {
  console.log('=== Phase 2: Descriptor cleanup ===\n');

  // 2a. Get the canonical set
  const canonicalRows = queryD1(`SELECT name FROM descriptors WHERE is_canonical = 1`);
  const canonical = new Set(canonicalRows.map(r => r.name));
  console.log(`Canonical descriptors: ${[...canonical].sort().join(', ')}\n`);

  // Known aliases to remap before discarding
  const ALIASES = { 'lo-fi': 'lofi' };

  // 2b. Fix user_album_descriptors junction table
  console.log('  Fixing user_album_descriptors …');

  // Remap aliases
  for (const [from, to] of Object.entries(ALIASES)) {
    if (!canonical.has(to)) {
      console.log(`  Warning: alias target "${to}" is not canonical — skipping remap of "${from}"`);
      continue;
    }
    runD1(`
      UPDATE OR IGNORE user_album_descriptors SET descriptor = '${to}' WHERE descriptor = '${from}';
      DELETE FROM user_album_descriptors WHERE descriptor = '${from}';
    `);
    console.log(`    → remapped "${from}" → "${to}"`);
  }

  // Delete non-canonical entries (anything not in the canonical set and not an alias source)
  const nonCanonical = queryD1(`
    SELECT DISTINCT descriptor FROM user_album_descriptors
    WHERE descriptor NOT IN (SELECT name FROM descriptors WHERE is_canonical = 1)
  `);

  if (nonCanonical.length === 0) {
    console.log('    → no non-canonical entries found in user_album_descriptors');
  } else {
    console.log(`    → found ${nonCanonical.length} non-canonical descriptor(s): ${nonCanonical.map(r => r.descriptor).join(', ')}`);
    for (const { descriptor } of nonCanonical) {
      runD1(`DELETE FROM user_album_descriptors WHERE descriptor = ${esc(descriptor)};`);
      console.log(`    → deleted "${descriptor}"`);
    }
  }

  // Clean up descriptors lookup table (remove non-canonical, non-alias entries)
  runD1(`DELETE FROM descriptors WHERE is_canonical = 0;`);
  console.log('    → removed non-canonical rows from descriptors table');

  // 2c. Patch user_albums.descriptors JSON column
  console.log('\n  Patching user_albums.descriptors JSON …');

  const userAlbumRows = queryD1(`
    SELECT id, descriptors FROM user_albums
    WHERE descriptors IS NOT NULL AND descriptors != '[]' AND descriptors != ''
  `);

  let patchCount = 0;
  const patchSql = [];

  for (const row of userAlbumRows) {
    let parsed;
    try { parsed = JSON.parse(row.descriptors); } catch { continue; }
    if (!Array.isArray(parsed)) continue;

    const fixed = parsed
      .map(d => ALIASES[d] ?? d)
      .filter(d => canonical.has(d));

    // Only write back if something changed
    if (JSON.stringify(fixed) !== JSON.stringify(parsed)) {
      patchSql.push(`UPDATE user_albums SET descriptors = ${esc(JSON.stringify(fixed))} WHERE id = ${row.id};`);
      patchCount++;
    }
  }

  if (patchSql.length > 0) {
    // Run in batches of 50 to avoid overly large SQL strings
    const BATCH = 50;
    for (let i = 0; i < patchSql.length; i += BATCH) {
      runD1(patchSql.slice(i, i + BATCH).join('\n'));
    }
    console.log(`    → patched ${patchCount} user_albums rows`);
  } else {
    console.log('    → no user_albums rows needed patching');
  }

  // 2d. Re-aggregate albums.all_descriptors and albums.descriptor_counts
  console.log('\n  Re-aggregating album descriptor counts …');

  runD1(`
    UPDATE albums SET
      all_descriptors   = COALESCE(
        (SELECT json_group_array(descriptor)
         FROM (SELECT DISTINCT descriptor FROM user_album_descriptors WHERE album_id = albums.id)),
        '[]'
      ),
      descriptor_counts = COALESCE(
        (SELECT json_group_object(descriptor, cnt)
         FROM (SELECT descriptor, COUNT(*) AS cnt FROM user_album_descriptors WHERE album_id = albums.id GROUP BY descriptor)),
        '{}'
      )
    WHERE id IN (SELECT DISTINCT album_id FROM user_album_descriptors)
       OR all_descriptors != '[]'
       OR descriptor_counts != '{}';
  `);

  console.log('    → done');
  console.log('\nPhase 2 complete.\n');
}

console.log('Backfill done.');
