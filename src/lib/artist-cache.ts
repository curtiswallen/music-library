const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };
const STALE_DAYS = 7;

export interface Member {
  name:        string;
  instruments: string[];
  beginYear?:  string;
  endYear?:    string;
  isActive?:   boolean;
}

function cleanInstrument(s: string): string {
  return s.replace(/\s*\(.*?\)\s*$/, '').trim();
}

function deduplicateMembers(members: Member[]): Member[] {
  const map = new Map<string, Member>();
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

export interface MembersData {
  current:  Member[];
  original: Member[];
  former:   Member[];
}

export interface ArtistRow {
  id:                 number;
  mbid:               string;
  name:               string;
  inception:          string | null;
  dissolution:        string | null;
  formation_location: string | null;
  logo_url:           string | null;
  wiki_blurb:         string | null;
  wiki_url:           string | null;
  members_data:       string;  // JSON MembersData
  updated_at:         string;
  created_at:         string;
}

export async function syncArtistData(db: D1Database, mbid: string, fallbackName: string): Promise<void> {
  try {
    const existing = await db.prepare(
      'SELECT updated_at FROM artists WHERE mbid = ?'
    ).bind(mbid).first<{ updated_at: string }>();

    if (existing) {
      const daysSince = (Date.now() - new Date(existing.updated_at + 'Z').getTime()) / 86_400_000;
      if (daysSince < STALE_DAYS) return;
    }

    const mbRes = await fetch(
      `${MB}/artist/${encodeURIComponent(mbid)}?inc=artist-rels+url-rels&fmt=json`,
      { headers: HDR }
    );
    if (!mbRes.ok) return;
    const mbData = await mbRes.json() as MBArtistResponse;
    const officialName = mbData.name ?? fallbackName;

    const currentMembers:  Member[] = [];
    const originalMembers: Member[] = [];
    const formerMembers:   Member[] = [];
    let wikidataId: string | null = null;
    let wikiUrl:    string | null = null;

    for (const rel of (mbData.relations ?? [])) {
      if (rel['target-type'] === 'artist' && rel.type === 'member of band' && rel.direction === 'backward') {
        const attrs = rel.attributes ?? [];
        const instruments = attrs
          .filter(a => !['original','additional','founder','guest','live'].includes(a))
          .map(cleanInstrument);
        const member: Member = {
          name:      (rel['target-credit'] as string | undefined)?.trim() || rel.artist!.name,
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

    let inception:           string | null = null;
    let dissolution:         string | null = null;
    let logoUrl:             string | null = null;
    let formationLocationId: string | null = null;
    let wikiBlurb:           string | null = null;

    const parallel: Promise<void>[] = [];

    if (wikidataId) {
      parallel.push(
        fetch(`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`, { headers: { 'User-Agent': UA } })
          .then(r => r.json() as Promise<WikidataResponse>)
          .then(wdData => {
            const entity = wdData.entities?.[wikidataId!];
            const claims = entity?.claims;
            if (claims) {
              const p571 = claims.P571?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
              if (p571?.time) inception = p571.time.slice(1, 5);

              const p576 = claims.P576?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
              if (p576?.time) dissolution = p576.time.slice(1, 5);

              const p154 = claims.P154?.[0]?.mainsnak?.datavalue?.value as string | undefined;
              if (typeof p154 === 'string' && p154)
                logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p154.replace(/ /g, '_'))}`;

              const p740 = claims.P740?.[0]?.mainsnak?.datavalue?.value as { id?: string } | undefined;
              if (p740?.id) formationLocationId = p740.id;
            }
            // Fall back to Wikidata sitelinks for Wikipedia URL if MB didn't provide one
            if (!wikiUrl) {
              const enwikiTitle = (entity as WikidataEntity | undefined)?.sitelinks?.enwiki?.title;
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
        const wpData = await wpRes.json() as { extract?: string };
        wikiBlurb = wpData.extract?.slice(0, 1500) ?? null;
      } catch {}
    }

    let formationLocation: string | null = null;
    if (formationLocationId) {
      try {
        const locRes = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${formationLocationId}&props=labels&languages=en&format=json`,
          { headers: { 'User-Agent': UA } }
        );
        const locData = await locRes.json() as { entities: Record<string, { labels?: Record<string, { value: string }> }> };
        formationLocation = locData.entities[formationLocationId]?.labels?.en?.value ?? null;
      } catch {}
    }

    const membersData: MembersData = {
      current:  deduplicateMembers(currentMembers),
      original: deduplicateMembers(originalMembers),
      former:   deduplicateMembers(formerMembers),
    };

    await db.prepare(`
      INSERT INTO artists (mbid, name, inception, dissolution, formation_location, logo_url, wiki_blurb, wiki_url, members_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mbid) DO UPDATE SET
        name               = excluded.name,
        inception          = excluded.inception,
        dissolution        = excluded.dissolution,
        formation_location = excluded.formation_location,
        logo_url           = excluded.logo_url,
        wiki_blurb         = excluded.wiki_blurb,
        wiki_url           = excluded.wiki_url,
        members_data       = excluded.members_data,
        updated_at         = datetime('now')
    `).bind(
      mbid, officialName,
      inception, dissolution, formationLocation,
      logoUrl, wikiBlurb, wikiUrl,
      JSON.stringify(membersData),
    ).run();
  } catch {
    // Never throw — background task must not crash the request
  }
}

interface MBArtistResponse {
  name: string;
  relations?: Array<{
    type:          string;
    'target-type': string;
    direction:     string;
    ended?:        boolean;
    begin?:        string | null;
    end?:          string | null;
    attributes?:   string[];
    artist?:       { id: string; name: string };
    url?:          { resource: string };
  }>;
}

interface WikidataEntity {
  claims?: Record<string, Array<{ mainsnak: { datavalue?: { value: unknown } } }>>;
  sitelinks?: Record<string, { title: string }>;
}

interface WikidataResponse {
  entities: Record<string, WikidataEntity>;
}
