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
 * Phase 3: split albums (artist contains ' / ')
 *   → fetch release-group artist credits from MB to get exact artist MBIDs
 *   → sync any artist MBID not already in the artists table
 *
 * Usage:
 *   node scripts/backfill-artist-data.mjs          (local D1 — default)
 *   node scripts/backfill-artist-data.mjs --remote  (remote D1)
 *   node scripts/backfill-artist-data.mjs --refresh-artists  (re-sync all, not just missing)
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

// Merge multiple MB relations for the same person (one row per instrument in MB)
function deduplicateMembers(members) {
  const map = new Map();
  for (const m of members) {
    const key = m.mbid || m.name; // mbid is more reliable; fall back to name
    const existing = map.get(key);
    if (existing) {
      for (const inst of m.instruments) {
        if (!existing.instruments.includes(inst)) existing.instruments.push(inst);
      }
      if (m.beginYear && (!existing.beginYear || m.beginYear < existing.beginYear))
        existing.beginYear = m.beginYear;
      if (m.endYear && (!existing.endYear || m.endYear > existing.endYear))
        existing.endYear = m.endYear;
    } else {
      map.set(key, { ...m, instruments: [...m.instruments] });
    }
  }
  return [...map.values()];
}

function buildMbLocation(beginArea, area) {
  const begin = beginArea?.name;
  const current = area?.name;
  if (!begin && !current) return null;
  if (!begin) return current ?? null;
  if (!current || begin === current) return begin;
  return `${begin}, ${current}`;
}

function runD1(sql) {
  const tmpFile = join(root, '.backfill-tmp.sql');
  writeFileSync(tmpFile, sql, 'utf8');
  try {
    execSync(
      `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --file="${tmpFile}" --yes`,
      { cwd: root, stdio: 'inherit' }
    );
  } finally {
    try { execSync(`del "${tmpFile}"`, { cwd: root, stdio: 'ignore', shell: true }); } catch {}
  }
}

function queryD1(sql) {
  // Use --command (not --file) so remote mode returns actual row data instead of stats
  const singleLine = sql.replace(/\s+/g, ' ').trim();
  const raw = execSync(
    `npx wrangler d1 execute ${DB_NAME} ${REMOTE_FLAG} --command "${singleLine}" --json`,
    { cwd: root }
  ).toString();
  const jsonStart = raw.search(/^\[/m);
  const out = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
  const parsed = JSON.parse(out);
  return parsed[0]?.results ?? [];
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

// ─── shared artist sync ───────────────────────────────────────────────────────

async function syncArtistFromMb(mbid, fallbackName) {
  console.log(`  Fetching artist ${mbid} (${fallbackName}) …`);
  try {
    await sleep(1100);

    const mbRes = await fetch(
      `${MB}/artist/${encodeURIComponent(mbid)}?inc=artist-rels+url-rels+aliases&fmt=json`,
      { headers: HDR }
    );
    if (!mbRes.ok) {
      console.log(`    → HTTP ${mbRes.status}, skipping`);
      return false;
    }
    const mbData = await mbRes.json();
    const officialName = mbData.name ?? fallbackName;

    // --- Dates and location from MB ---
    const mbInception   = mbData['life-span']?.begin?.slice(0, 4) ?? null;
    const mbDissolution = mbData['life-span']?.ended
      ? (mbData['life-span']?.end?.slice(0, 4) ?? null)
      : null;
    const mbDisambiguation = mbData.disambiguation?.trim() || null;

    // --- Aliases: Artist name type only, with begin/end dates, sorted chronologically ---
    const mbAliases = (mbData.aliases ?? [])
      .filter(a => a.type === 'Artist name' && a.name?.trim() && a.name.trim() !== officialName)
      .map(a => ({ name: a.name.trim(), begin: a.begin?.slice(0, 4) ?? null, end: a.end?.slice(0, 4) ?? null }))
      .filter((a, i, arr) => arr.findIndex(x => x.name === a.name) === i)
      .sort((a, b) => {
        if (!a.begin && !b.begin) return 0;
        if (!a.begin) return 1;
        if (!b.begin) return -1;
        return a.begin.localeCompare(b.begin);
      });

    // --- Relations ---
    const currentMembers  = [];
    const originalMembers = [];
    const formerMembers   = [];
    const isPersonList    = [];
    let wikidataId = null;
    let wikiUrl    = null;

    for (const rel of (mbData.relations ?? [])) {
      if (rel['target-type'] === 'artist') {
        const personMbid    = rel.artist?.id ?? null;
        const canonicalName = rel.artist?.name;
        const personName    = rel['target-credit']?.trim() || canonicalName;
        if (!personName) continue;

        if (rel.type === 'member of band' && rel.direction === 'backward') {
          const attrs = rel.attributes ?? [];
          const instruments = attrs
            .filter(a => !['original','additional','founder','guest','live'].includes(a))
            .map(cleanInstrument);
          const member = {
            name:          personName,
            mbid:          personMbid,
            canonicalName: (canonicalName && canonicalName !== personName) ? canonicalName : null,
            instruments,
            beginYear: rel.begin?.slice(0, 4) ?? null,
            endYear:   rel.end?.slice(0, 4)   ?? null,
            isActive:  !rel.ended,
          };
          if (attrs.includes('original'))   originalMembers.push(member);
          else if (!rel.ended)              currentMembers.push(member);
          else                              formerMembers.push(member);
        }

        if (rel.type === 'is person' && rel.direction === 'backward') {
          isPersonList.push({
            name:        personName,
            mbid:        personMbid,
            instruments: [],
            beginYear:   mbInception,
            endYear:     mbDissolution,
            isActive:    !mbData['life-span']?.ended,
          });
        }
      }

      if (rel['target-type'] === 'url') {
        const u = rel.url?.resource ?? '';
        if (!wikidataId) {
          const wdm = u.match(/wikidata\.org(?:\/wiki|\/entity)\/(Q\d+)/);
          if (wdm) wikidataId = wdm[1];
        }
        if (!wikiUrl && /en\.wikipedia\.org\/wiki\//.test(u)) wikiUrl = u;
      }
    }

    // Fetch person entity data for isPersonOf entries (stage name aka + other projects)
    for (const personEntry of isPersonList) {
      if (!personEntry.mbid) continue;
      await sleep(1100);
      try {
        const pRes = await fetch(
          `${MB}/artist/${encodeURIComponent(personEntry.mbid)}?inc=artist-rels+aliases&fmt=json`,
          { headers: HDR }
        );
        if (!pRes.ok) {
          console.log(`      → person entity HTTP ${pRes.status} for ${personEntry.mbid}`);
          continue;
        }
        const pData = await pRes.json();

        const pAliases = (pData.aliases ?? [])
          .filter(a => a.type !== 'Legal name')
          .map(a => a.name?.trim())
          .filter(n => n && n !== pData.name);

        const performsAs = [];
        for (const pRel of (pData.relations ?? [])) {
          if (pRel['target-type'] === 'artist' && pRel.type === 'is person' && pRel.direction === 'forward') {
            if (pRel.artist?.id && pRel.artist?.name) {
              performsAs.push({ name: pRel.artist.name, mbid: pRel.artist.id });
            }
          }
        }

        const performsAsNames = performsAs.map(p => p.name.toLowerCase());
        personEntry.personAka  = pAliases.find(a => performsAsNames.includes(a.toLowerCase())) || undefined;
        personEntry.performsAs = performsAs;
        console.log(`      → person ${personEntry.name}: aka=${personEntry.personAka ?? 'n/a'}, performs_as=${performsAs.length}`);
      } catch (e) {
        console.log(`      → failed to fetch person data for ${personEntry.mbid}: ${e.message}`);
      }
    }

    // --- MB values first; Wikidata fills gaps and provides logo + wiki link ---
    let inception         = mbInception;
    let dissolution       = mbDissolution;
    let formationLocation = buildMbLocation(mbData['begin-area'], mbData['area']);
    let logoUrl           = null;
    let wikiBlurb         = null;

    if (wikidataId) {
      await sleep(300);
      try {
        const wdRes = await fetch(
          `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
          { headers: { 'User-Agent': UA } }
        );
        const wdData = await wdRes.json();
        const entity = wdData.entities?.[wikidataId];
        const claims = entity?.claims ?? {};

        if (!inception) {
          const wdTime = (prop) => claims[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
          const t = wdTime('P571') || wdTime('P2031');
          if (t) inception = t.slice(1, 5);
        }
        if (!dissolution) {
          const wdTime = (prop) => claims[prop]?.[0]?.mainsnak?.datavalue?.value?.time;
          const t = wdTime('P576') || wdTime('P2032');
          if (t) dissolution = t.slice(1, 5);
        }
        const p154 = claims.P154?.[0]?.mainsnak?.datavalue?.value;
        if (typeof p154 === 'string' && p154)
          logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p154.replace(/ /g, '_'))}`;

        if (!formationLocation) {
          const p740 = claims.P740?.[0]?.mainsnak?.datavalue?.value;
          if (p740?.id) {
            await sleep(300);
            try {
              const locRes = await fetch(
                `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${p740.id}&props=labels&languages=en&format=json`,
                { headers: { 'User-Agent': UA } }
              );
              const locData = await locRes.json();
              formationLocation = locData.entities[p740.id]?.labels?.en?.value ?? null;
            } catch {}
          }
        }
        if (!wikiUrl) {
          const enwikiTitle = entity?.sitelinks?.enwiki?.title;
          if (enwikiTitle) wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(enwikiTitle.replace(/ /g, '_'))}`;
        }
      } catch {}
    }

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

    const dedupedOriginal = deduplicateMembers(originalMembers);
    const dedupedCurrent  = deduplicateMembers(currentMembers);
    const dedupedFormer   = deduplicateMembers(formerMembers);

    const membersData = JSON.stringify({
      current:    dedupedCurrent,
      original:   dedupedOriginal,
      former:     dedupedFormer,
      isPersonOf: isPersonList,
    });

    const artistType = mbData.type ?? null;
    runD1(`
      INSERT INTO artists (mbid, name, artist_type, disambiguation, inception, dissolution, formation_location, logo_url, wiki_blurb, wiki_url, members_data, aliases)
      VALUES (${esc(mbid)}, ${esc(officialName)}, ${esc(artistType)}, ${esc(mbDisambiguation)}, ${esc(inception)}, ${esc(dissolution)}, ${esc(formationLocation)}, ${esc(logoUrl)}, ${esc(wikiBlurb)}, ${esc(wikiUrl)}, ${esc(membersData)}, ${esc(JSON.stringify(mbAliases))})
      ON CONFLICT(mbid) DO UPDATE SET
        name               = excluded.name,
        artist_type        = excluded.artist_type,
        disambiguation     = excluded.disambiguation,
        inception          = excluded.inception,
        dissolution        = excluded.dissolution,
        formation_location = excluded.formation_location,
        logo_url           = excluded.logo_url,
        wiki_blurb         = excluded.wiki_blurb,
        wiki_url           = excluded.wiki_url,
        members_data       = excluded.members_data,
        aliases            = excluded.aliases,
        updated_at         = datetime('now');
    `);

    // Populate artist_members junction table
    const allMemberRows = [
      ...dedupedOriginal.map(m => ({ ...m, role: 'original' })),
      ...dedupedCurrent.map(m => ({ ...m, role: 'current' })),
      ...dedupedFormer.map(m => ({ ...m, role: 'former' })),
      ...isPersonList.map(m => ({ ...m, role: 'is_person' })),
    ].filter(m => m.mbid);

    if (allMemberRows.length > 0) {
      const insertRows = allMemberRows.map(m =>
        `(${esc(mbid)}, ${esc(m.mbid)}, ${esc(m.name)}, ${esc(m.role)}, ${esc(JSON.stringify(m.instruments))}, ${esc(m.beginYear ?? null)}, ${esc(m.endYear ?? null)}, ${m.isActive ? 1 : 0}, ${esc(m.canonicalName ?? null)})`
      ).join(',\n        ');
      runD1(`
        DELETE FROM artist_members WHERE artist_mbid = ${esc(mbid)};
        INSERT OR IGNORE INTO artist_members (artist_mbid, person_mbid, person_name, role, instruments, begin_year, end_year, is_active, canonical_name)
        VALUES ${insertRows};
      `);
    }

    const totalMembers = dedupedOriginal.length + dedupedCurrent.length + dedupedFormer.length + isPersonList.length;
    console.log(`    → inserted/updated: ${officialName} (inception=${inception ?? 'n/a'}, members=${totalMembers}, aliases=${mbAliases.length})`);
    return true;
  } catch (err) {
    console.error(`    → error for ${mbid}: ${err.message}`);
    return false;
  }
}

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
  const synced = await syncArtistFromMb(mbid, fallbackName);
  if (synced) phase2Added++;
}

console.log(`\nPhase 2 complete. Inserted/updated ${phase2Added} artists.\n`);

// ─── Phase 3: sync split album artists ───────────────────────────────────────

console.log('=== Phase 3: sync split album artists ===\n');

const splitAlbums = queryD1(
  `SELECT DISTINCT mbid, artist FROM albums WHERE artist LIKE '% / %' AND mbid IS NOT NULL ORDER BY artist`
);

console.log(`Found ${splitAlbums.length} split albums to process.\n`);

let phase3Added = 0;

for (const { mbid: rgMbid, artist } of splitAlbums) {
  try {
    console.log(`  Fetching credits for: ${artist} …`);
    await sleep(1100);
    const res = await fetch(
      `${MB}/release-group/${encodeURIComponent(rgMbid)}?inc=artist-credits&fmt=json`,
      { headers: HDR }
    );
    if (!res.ok) {
      console.log(`    → HTTP ${res.status}, skipping`);
      continue;
    }
    const rg = await res.json();
    const credits = (rg['artist-credit'] ?? []).filter(c => c.artist?.id);

    for (const credit of credits) {
      const creditMbid = credit.artist.id;
      const creditName = credit.artist.name;
      const existing = queryD1(`SELECT 1 FROM artists WHERE mbid = ${esc(creditMbid)}`);
      if (existing.length > 0 && !REFRESH_ARTISTS) {
        console.log(`    → ${creditName} already synced, skipping`);
        continue;
      }
      const synced = await syncArtistFromMb(creditMbid, creditName);
      if (synced) phase3Added++;
    }
  } catch (err) {
    console.error(`    → error processing "${artist}": ${err.message}`);
  }
}

console.log(`\nPhase 3 complete. Inserted/updated ${phase3Added} artists.\n`);
console.log('Backfill done.');
