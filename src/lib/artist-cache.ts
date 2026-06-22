const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };
const STALE_DAYS = 7;

export interface Member {
  name:           string;
  mbid?:          string;
  canonicalName?: string;
  personAka?:     string;
  performsAs?:    Array<{ name: string; mbid: string }>;
  instruments:    string[];
  beginYear?:     string | null;
  endYear?:       string | null;
  isActive?:      boolean;
}

export interface MembersData {
  current:    Member[];
  original:   Member[];
  former:     Member[];
  isPersonOf: Member[];
}

export interface AliasEntry {
  name:  string;
  begin: string | null;
  end:   string | null;
}

export interface ArtistRow {
  id:                 number;
  mbid:               string;
  name:               string;
  artist_type:        string | null;
  disambiguation:     string | null;
  inception:          string | null;
  dissolution:        string | null;
  formation_location: string | null;
  logo_url:           string | null;
  wiki_blurb:         string | null;
  wiki_url:           string | null;
  members_data:       string;
  aliases:            string;
  overrides:          string;
  updated_at:         string;
  created_at:         string;
}

function cleanInstrument(s: string): string {
  return s.replace(/\s*\(.*?\)\s*$/, '').trim();
}

// Merge multiple MB relations for the same person (one row per instrument in MB)
function deduplicateMembers(members: Member[]): Member[] {
  const map = new Map<string, Member>();
  for (const m of members) {
    const key = m.mbid || m.name;
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

function buildMbLocation(beginArea?: { name?: string } | null, area?: { name?: string } | null): string | null {
  const begin = beginArea?.name;
  const current = area?.name;
  if (!begin && !current) return null;
  if (!begin) return current ?? null;
  if (!current || begin === current) return begin;
  return `${begin}, ${current}`;
}

function wdTime(claims: WdClaims, prop: string): string | null {
  const t = claims[prop]?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
  return t?.time?.slice(1, 5) ?? null;
}

export async function syncArtistData(db: D1Database, mbid: string, fallbackName: string): Promise<void> {
  try {
    const existing = await db.prepare(
      'SELECT updated_at, overrides FROM artists WHERE mbid = ?'
    ).bind(mbid).first<{ updated_at: string; overrides: string }>();

    if (existing) {
      const daysSince = (Date.now() - new Date(existing.updated_at + 'Z').getTime()) / 86_400_000;
      if (daysSince < STALE_DAYS) return;
    }

    const mbRes = await fetch(
      `${MB}/artist/${encodeURIComponent(mbid)}?inc=artist-rels+url-rels+aliases&fmt=json`,
      { headers: HDR }
    );
    if (!mbRes.ok) return;
    const mbData = await mbRes.json() as MBArtistResponse;
    const officialName = mbData.name ?? fallbackName;

    // --- Dates and location from MB (primary source) ---
    const mbInception   = mbData['life-span']?.begin?.slice(0, 4) ?? null;
    const mbDissolution = mbData['life-span']?.ended
      ? (mbData['life-span']?.end?.slice(0, 4) ?? null)
      : null;
    let mbDisambiguation = mbData.disambiguation?.trim() || null;
    let mbAliases: AliasEntry[] = (mbData.aliases ?? [])
      .filter((a): a is typeof a & { name: string } => a.type === 'Artist name' && !!a.name && a.name.trim() !== officialName)
      .map(a => ({ name: a.name.trim(), begin: a.begin?.slice(0, 4) ?? null, end: a.end?.slice(0, 4) ?? null }))
      .filter((a, i, arr) => arr.findIndex(x => x.name === a.name) === i)
      .sort((a, b) => {
        if (!a.begin && !b.begin) return 0;
        if (!a.begin) return 1;
        if (!b.begin) return -1;
        return a.begin.localeCompare(b.begin);
      });

    // --- Relations ---
    const currentMembers:  Member[] = [];
    const originalMembers: Member[] = [];
    const formerMembers:   Member[] = [];
    const isPersonList:    Member[] = [];
    let wikidataId: string | null = null;
    let wikiUrl:    string | null = null;

    for (const rel of (mbData.relations ?? [])) {
      if (rel['target-type'] === 'artist') {
        const personMbid = rel.artist?.id ?? undefined;
        const canonicalName = rel.artist?.name;
        const personName = rel['target-credit']?.trim() || canonicalName;
        if (!personName) continue;

        if (rel.type === 'member of band' && rel.direction === 'backward') {
          const attrs = rel.attributes ?? [];
          const instruments = attrs
            .filter(a => !['original','additional','founder','guest','live'].includes(a))
            .map(cleanInstrument);
          const member: Member = {
            name:          personName,
            mbid:          personMbid,
            canonicalName: (canonicalName && canonicalName !== personName) ? canonicalName : undefined,
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
            name:      personName,
            mbid:      personMbid,
            instruments: [],
            beginYear: mbInception,
            endYear:   mbDissolution,
            isActive:  !mbData['life-span']?.ended,
          });
        }
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

    // Fetch person entity data for isPersonOf entries (to get their stage name aka and other projects)
    for (const personEntry of isPersonList) {
      if (!personEntry.mbid) continue;
      try {
        const pRes = await fetch(
          `${MB}/artist/${encodeURIComponent(personEntry.mbid)}?inc=artist-rels+aliases&fmt=json`,
          { headers: HDR }
        );
        if (!pRes.ok) continue;
        const pData = await pRes.json() as MBArtistResponse;

        const pAliases = (pData.aliases ?? [])
          .filter(a => a.type !== 'Legal name')
          .map(a => a.name?.trim())
          .filter((n): n is string => !!n && n !== pData.name);

        const performsAs: Array<{ name: string; mbid: string }> = [];
        for (const pRel of (pData.relations ?? [])) {
          if (pRel['target-type'] === 'artist' && pRel.type === 'is person' && pRel.direction === 'forward') {
            if (pRel.artist?.id && pRel.artist.name) {
              performsAs.push({ name: pRel.artist.name, mbid: pRel.artist.id });
            }
          }
        }

        const performsAsNames = performsAs.map(p => p.name.toLowerCase());
        personEntry.personAka = pAliases.find(a => performsAsNames.includes(a.toLowerCase()));
        personEntry.performsAs = performsAs;
      } catch {}
    }

    // --- Start with MB values; Wikidata fills gaps and provides logo + wiki link ---
    let inception         = mbInception;
    let dissolution       = mbDissolution;
    let formationLocation = buildMbLocation(mbData['begin-area'], mbData['area']);
    let logoUrl:    string | null = null;
    let wikiBlurb:  string | null = null;

    if (wikidataId) {
      try {
        const wdRes = await fetch(
          `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`,
          { headers: { 'User-Agent': UA } }
        );
        const wdData = await wdRes.json() as WikidataResponse;
        const entity = wdData.entities?.[wikidataId];
        const claims: WdClaims = (entity?.claims ?? {}) as WdClaims;

        if (!inception)   inception   = wdTime(claims, 'P571') || wdTime(claims, 'P2031');
        if (!dissolution) dissolution = wdTime(claims, 'P576') || wdTime(claims, 'P2032');

        const p154 = claims.P154?.[0]?.mainsnak?.datavalue?.value as string | undefined;
        if (typeof p154 === 'string' && p154)
          logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p154.replace(/ /g, '_'))}`;

        if (!formationLocation) {
          const p740 = claims.P740?.[0]?.mainsnak?.datavalue?.value as { id?: string } | undefined;
          if (p740?.id) {
            try {
              const locRes = await fetch(
                `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${p740.id}&props=labels&languages=en&format=json`,
                { headers: { 'User-Agent': UA } }
              );
              const locData = await locRes.json() as { entities: Record<string, { labels?: Record<string, { value: string }> }> };
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
        const wpData = await wpRes.json() as { extract?: string };
        wikiBlurb = wpData.extract?.slice(0, 1500) ?? null;
      } catch {}
    }

    // Apply any manually set overrides — overridden fields won't be stomped by future MB syncs
    let savedOverrides: Record<string, unknown> = {};
    try { savedOverrides = JSON.parse(existing?.overrides || '{}') as Record<string, unknown>; } catch {}
    const ov = <T>(key: string, computed: T): T => key in savedOverrides ? (savedOverrides[key] as T) : computed;

    mbDisambiguation = ov('disambiguation', mbDisambiguation);
    inception        = ov('inception',        inception);
    dissolution      = ov('dissolution',      dissolution);
    formationLocation = ov('formation_location', formationLocation);
    logoUrl          = ov('logo_url',         logoUrl);
    wikiBlurb        = ov('wiki_blurb',       wikiBlurb);
    wikiUrl          = ov('wiki_url',         wikiUrl);
    mbAliases        = ov('aliases',          mbAliases);

    const dedupedOriginal = deduplicateMembers(originalMembers);
    const dedupedCurrent  = deduplicateMembers(currentMembers);
    const dedupedFormer   = deduplicateMembers(formerMembers);

    const membersData: MembersData = ov('members_data', {
      current:    dedupedCurrent,
      original:   dedupedOriginal,
      former:     dedupedFormer,
      isPersonOf: isPersonList,
    });

    // Build artist_members rows (only where we have person mbid)
    const allMemberRows = [
      ...membersData.original.map(m => ({ ...m, role: 'original' })),
      ...membersData.current.map(m => ({ ...m, role: 'current' })),
      ...membersData.former.map(m => ({ ...m, role: 'former' })),
      ...(membersData.isPersonOf ?? []).map(m => ({ ...m, role: 'is_person' })),
    ].filter(m => m.mbid);

    const stmts: D1PreparedStatement[] = [
      db.prepare(`
        INSERT INTO artists (mbid, name, artist_type, disambiguation, inception, dissolution, formation_location, logo_url, wiki_blurb, wiki_url, members_data, aliases)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          updated_at         = datetime('now')
      `).bind(
        mbid, officialName, mbData.type ?? null, mbDisambiguation,
        inception, dissolution, formationLocation,
        logoUrl, wikiBlurb, wikiUrl,
        JSON.stringify(membersData),
        JSON.stringify(mbAliases),
      ),
    ];

    if (allMemberRows.length > 0) {
      stmts.push(db.prepare('DELETE FROM artist_members WHERE artist_mbid = ?').bind(mbid));
      for (const m of allMemberRows) {
        stmts.push(db.prepare(`
          INSERT OR IGNORE INTO artist_members (artist_mbid, person_mbid, person_name, role, instruments, begin_year, end_year, is_active, canonical_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          mbid, m.mbid!, m.name, m.role,
          JSON.stringify(m.instruments),
          m.beginYear ?? null, m.endYear ?? null,
          m.isActive ? 1 : 0,
          m.canonicalName ?? null,
        ));
      }
    }

    await db.batch(stmts);
  } catch {
    // Never throw — background task must not crash the request
  }
}

export async function syncAllArtistsForAlbum(db: D1Database, rgMbid: string): Promise<void> {
  try {
    const res = await fetch(
      `${MB}/release-group/${encodeURIComponent(rgMbid)}?inc=artist-credits&fmt=json`,
      { headers: HDR }
    );
    if (!res.ok) return;
    const rg = await res.json() as { 'artist-credit'?: Array<{ artist?: { id?: string; name?: string } }> };
    for (const credit of (rg['artist-credit'] ?? [])) {
      if (credit.artist?.id && credit.artist?.name) {
        await syncArtistData(db, credit.artist.id, credit.artist.name);
      }
    }
  } catch {
    // Never throw — background task must not crash the request
  }
}

type WdClaims = Record<string, Array<{ mainsnak: { datavalue?: { value: unknown } } }>>;

interface MBArtistResponse {
  name:           string;
  disambiguation?: string;
  type?:          string;
  'life-span'?:   { begin?: string | null; end?: string | null; ended?: boolean };
  'begin-area'?:  { name?: string } | null;
  area?:          { name?: string } | null;
  aliases?:       Array<{ name?: string; type?: string | null; locale?: string | null; begin?: string | null; end?: string | null }>;
  relations?:     Array<{
    type:           string;
    'target-type':  string;
    direction:      string;
    ended?:         boolean;
    begin?:         string | null;
    end?:           string | null;
    attributes?:    string[];
    'target-credit'?: string | null;
    artist?:        { id: string; name: string };
    url?:           { resource: string };
  }>;
}

interface WikidataEntity {
  claims?:    Record<string, Array<{ mainsnak: { datavalue?: { value: unknown } } }>>;
  sitelinks?: Record<string, { title: string }>;
}

interface WikidataResponse {
  entities: Record<string, WikidataEntity>;
}
