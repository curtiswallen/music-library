#!/usr/bin/env node
/**
 * Backfill artist_mbid + release_type on existing albums, then populate the artists table.
 *
 * Phase 1: albums with an MB mbid but missing release_type or artist_mbid
 *   → fetch release-group from MB, extract primary-type / secondary-types and artist credits
 *   → write SQL UPDATE statements
 *
 * Phase 2: distinct artist_mbid values not yet in the artists table
 *   → fetch full artist data from MB + Wikidata + Wikipedia
 *   → write SQL INSERT OR REPLACE statements
 *
 * Usage:
 *   node scripts/backfill-artist-data.mjs          (local D1 — default)
 *   node scripts/backfill-artist-data.mjs --remote  (remote D1)
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const REMOTE          = process.argv.includes('--remote');
const REFRESH_ARTISTS = process.argv.includes('--refresh-artists');
const REMOTE_FLAG = REMOTE ? '--remote' : '';
const DB_NAME = 'music-library';

const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1 (backfill)';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function cleanInstrument(s) {
  return s.replace(/\s*\(.*?\)\s*$/, '').trim();
}

function deduplicateMembers(members) {
  const map = new Map();
  for (const m of members) {
    const existing = map.get(m.name);
    if (existing) {
      for (const inst of m.instruments) {
        if (!existing.instruments.includes(inst)) existing.instruments.push(inst);
      }
      if (m.beginYear && (!existing.beginYear || m.beginYear < existing.beginYear))
        existing.beginYear = m.beginYear;
      if (m.endYear && (!existing.endYear || m.endYear > existing.endYear))
        existing.endYear = m.endYear;
    } else {
      map.set(m.name, { ...m, instruments: [...m.instruments] });
    }
  }
  return [...map.values()];
}

function runD1(sql) {
  const tmpFile = join(root, '.backfill-tmp.sql');
  writeFileSync(tmpFile, sql, 'utf8');
  try {
    execSync(
      `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --file="${tmpFile}"`,
      { cwd: root, stdio: 'inherit' }
    );
  } finally {
    try { execSync(`del "${tmpFile}"`, { cwd: root, stdio: 'ignore', shell: true }); } catch {}
  }
}

function queryD1(sql) {
  const tmpFile = join(root, '.backfill-query-tmp.sql');
  writeFileSync(tmpFile, sql, 'utf8');
  try {
    const out = execSync(
      `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --file="${tmpFile}" --json`,
      { cwd: root }
    ).toString();
    const parsed = JSON.parse(out);
    return parsed[0]?.results ?? [];
  } finally {
    try { execSync(`del "${tmpFile}"`, { cwd: root, stdio: 'ignore', shell: true }); } catch {}
  }
}

function esc(v) {
  if (v == null) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function mapReleaseType(primary, secondary = []) {
  const sec = secondary.map(s => s.toLowerCase());
  if (sec.includes('demo'))        return 'demo';
  if (sec.includes('compilation')) return 'compilation';
  const p = (primary ?? '').toLowerCase();
  if (p === 'album')  return 'lp';
  if (p === 'ep')     return 'ep';
  if (p === 'single') return 'single';
  if (p)              return 'other';
  return null;
}

// ─── Phase 1: backfill release_type and artist_mbid ─────────────────────────

console.log('\n=== Phase 1: backfill release_type + artist_mbid ===\n');

const albumsToUpdate = queryD1(`
  SELECT id, mbid, artist FROM albums
  WHERE mbid IS NOT NULL
    AND artist_mbid IS NULL
  ORDER BY id
`);

console.log(`Found ${albumsToUpdate.length} albums to update.`);

let phase1Updated = 0;

for (const row of albumsToUpdate) {
  try {
    console.log(`  [${row.id}] Fetching release-group ${row.mbid} …`);
    const res = await fetch(
      `${MB}/release-group/${encodeURIComponent(row.mbid)}?inc=artist-credits&fmt=json`,
      { headers: HDR }
    );
    if (!res.ok) {
      console.log(`    → HTTP ${res.status}, skipping`);
      await sleep(1100);
      continue;
    }
    const rg = await res.json();

    const releaseType = mapReleaseType(rg['primary-type'], rg['secondary-types']);
    const artistCredit = rg['artist-credit']?.[0];
    const artistMbid = artistCredit?.artist?.id ?? null;

    const setClauses = [];
    if (releaseType !== null) setClauses.push(`release_type = ${esc(releaseType)}`);
    if (artistMbid  !== null) setClauses.push(`artist_mbid = ${esc(artistMbid)}`);

    if (setClauses.length) {
      runD1(`UPDATE albums SET ${setClauses.join(', ')} WHERE id = ${row.id};`);
      console.log(`    → release_type=${releaseType ?? 'skip'}, artist_mbid=${artistMbid ?? 'skip'}`);
      phase1Updated++;
    } else {
      console.log('    → nothing to set');
    }
  } catch (err) {
    console.error(`    → error: ${err.message}`);
  }

  await sleep(1100); // MB rate limit: 1 req/sec
}

console.log(`\nPhase 1 complete. Updated ${phase1Updated} albums.\n`);

// ─── Phase 2: populate artists table ────────────────────────────────────────

console.log('=== Phase 2: populate artists table ===\n');

const artistMbids = queryD1(REFRESH_ARTISTS
  ? `SELECT DISTINCT artist_mbid, artist FROM albums WHERE artist_mbid IS NOT NULL ORDER BY artist_mbid`
  : `SELECT DISTINCT a.artist_mbid, a.artist FROM albums a WHERE a.artist_mbid IS NOT NULL AND a.artist_mbid NOT IN (SELECT mbid FROM artists)`
);

console.log(`Found ${artistMbids.length} artists to fetch.\n`);

let phase2Added = 0;

for (const { artist_mbid: mbid, artist } of artistMbids) {
  const fallbackName = artist.split(' / ')[0].trim();
  console.log(`  Fetching artist ${mbid} (${fallbackName}) …`);

  try {
    await sleep(1100);

    const mbRes = await fetch(
      `${MB}/artist/${encodeURIComponent(mbid)}?inc=artist-rels+url-rels&fmt=json`,
      { headers: HDR }
    );
    if (!mbRes.ok) {
      console.log(`    → HTTP ${mbRes.status}, skipping`);
      continue;
    }
    const mbData = await mbRes.json();
    const officialName = mbData.name ?? fallbackName;

    const currentMembers  = [];
    const originalMembers = [];
    const formerMembers   = [];
    let wikidataId = null;
    let wikiUrl    = null;

    for (const rel of (mbData.relations ?? [])) {
      if (rel['target-type'] === 'artist' && rel.type === 'member of band' && rel.direction === 'backward') {
        const attrs = rel.attributes ?? [];
        const instruments = attrs
          .filter(a => !['original','additional','founder','guest','live'].includes(a))
          .map(cleanInstrument);
        const member = {
          name:      rel['target-credit']?.trim() || rel.artist.name,
          instruments,
          beginYear: rel.begin?.slice(0, 4) ?? undefined,
          endYear:   rel.end?.slice(0, 4)   ?? undefined,
          isActive:  !rel.ended,
        };
        if (attrs.includes('original'))   originalMembers.push(member);
        else if (!rel.ended)              currentMembers.push(member);
        else                              formerMembers.push(member);
      }
      if (rel['target-type'] === 'url') {
        const u = rel.url?.resource ?? '';
        if (!wikidataId) {
          const m = u.match(/wikidata\.org(?:\/wiki|\/entity)\/(Q\d+)/);
          if (m) wikidataId = m[1];
        }
        if (!wikiUrl && /en\.wikipedia\.org\/wiki\//.test(u)) wikiUrl = u;
      }
    }

    let inception           = null;
    let dissolution         = null;
    let logoUrl             = null;
    let formationLocationId = null;
    let wikiBlurb           = null;

    const parallel = [];

    if (wikidataId) {
      await sleep(300);
      parallel.push(
        fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`, { headers: { 'User-Agent': UA } })
          .then(r => r.json())
          .then(wdData => {
            const entity = wdData.entities?.[wikidataId];
            const claims = entity?.claims;
            if (claims) {
              const p571 = claims.P571?.[0]?.mainsnak?.datavalue?.value;
              if (p571?.time) inception = p571.time.slice(1, 5);
              const p576 = claims.P576?.[0]?.mainsnak?.datavalue?.value;
              if (p576?.time) dissolution = p576.time.slice(1, 5);
              const p154 = claims.P154?.[0]?.mainsnak?.datavalue?.value;
              if (typeof p154 === 'string' && p154)
                logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p154.replace(/ /g, '_'))}`;
              const p740 = claims.P740?.[0]?.mainsnak?.datavalue?.value;
              if (p740?.id) formationLocationId = p740.id;
            }
            // Fall back to Wikidata sitelinks for Wikipedia URL if MB didn't provide one
            if (!wikiUrl) {
              const enwikiTitle = entity?.sitelinks?.enwiki?.title;
              if (enwikiTitle) wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiTitle.replace(/ /g, '_'))}`;
            }
          })
          .catch(() => {})
      );
    }

    await Promise.all(parallel);

    if (wikiUrl) {
      try {
        const title = decodeURIComponent(wikiUrl.split('/wiki/')[1] ?? '');
        const wpRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { 'User-Agent': UA } }
        );
        const wpData = await wpRes.json();
        wikiBlurb = wpData.extract?.slice(0, 1500) ?? null;
      } catch {}
    }

    let formationLocation = null;
    if (formationLocationId) {
      try {
        await sleep(300);
        const locRes = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${formationLocationId}&props=labels&languages=en&format=json`,
          { headers: { 'User-Agent': UA } }
        );
        const locData = await locRes.json();
        formationLocation = locData.entities[formationLocationId]?.labels?.en?.value ?? null;
      } catch {}
    }

    const membersData = JSON.stringify({
      current:  deduplicateMembers(currentMembers),
      original: deduplicateMembers(originalMembers),
      former:   deduplicateMembers(formerMembers),
    });

    runD1(`
      INSERT INTO artists (mbid, name, inception, dissolution, formation_location, logo_url, wiki_blurb, wiki_url, members_data)
      VALUES (${esc(mbid)}, ${esc(officialName)}, ${esc(inception)}, ${esc(dissolution)}, ${esc(formationLocation)}, ${esc(logoUrl)}, ${esc(wikiBlurb)}, ${esc(wikiUrl)}, ${esc(membersData)})
      ON CONFLICT(mbid) DO UPDATE SET
        name               = excluded.name,
        inception          = excluded.inception,
        dissolution        = excluded.dissolution,
        formation_location = excluded.formation_location,
        logo_url           = excluded.logo_url,
        wiki_blurb         = excluded.wiki_blurb,
        wiki_url           = excluded.wiki_url,
        members_data       = excluded.members_data,
        updated_at         = datetime('now');
    `);

    console.log(`    → inserted/updated: ${officialName} (inception=${inception ?? 'n/a'}, members=${currentMembers.length + originalMembers.length + formerMembers.length})`);
    phase2Added++;
  } catch (err) {
    console.error(`    → error for ${mbid}: ${err.message}`);
  }
}

console.log(`\nPhase 2 complete. Inserted/updated ${phase2Added} artists.\n`);
console.log('Backfill done.');
