import type { APIRoute } from 'astro';

const MB = 'https://musicbrainz.org/ws/2';
const UA = 'MusicLibraryApp/0.1 (https://github.com/curtiswallen/music-library)';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

export const GET: APIRoute = async ({ url }) => {
  const mbid = url.searchParams.get('mbid')?.trim();
  if (!mbid) return json({ error: 'Missing mbid' }, 400);

  try {
    const mbRes = await fetch(
      `${MB}/artist/${encodeURIComponent(mbid)}?inc=artist-rels+url-rels&fmt=json`,
      { headers: HDR }
    );
    if (!mbRes.ok) return json({ error: 'Artist not found' }, 404);
    const mbData = await mbRes.json() as MBArtist;

    const currentMembers:  Member[] = [];
    const originalMembers: Member[] = [];
    const formerMembers:   Member[] = [];

    let wikidataId: string | null = null;
    let wikiUrl:    string | null = null;

    for (const rel of (mbData.relations ?? [])) {
      if (rel['target-type'] === 'artist' && rel.type === 'member of band' && rel.direction === 'backward') {
        const attrs     = rel.attributes ?? [];
        const isOriginal = attrs.includes('original');
        const instruments = attrs.filter(a => !['original', 'additional', 'founder', 'guest', 'live'].includes(a));
        const member: Member = {
          name: rel.artist!.name,
          instruments,
          beginYear: rel.begin?.slice(0, 4) ?? undefined,
          endYear:   rel.end?.slice(0, 4)   ?? undefined,
        };
        if (isOriginal) {
          originalMembers.push(member);
        } else if (!rel.ended) {
          currentMembers.push(member);
        } else {
          formerMembers.push(member);
        }
      }
      if (rel['target-type'] === 'url') {
        const u = rel.url?.resource ?? '';
        if (!wikidataId) {
          const m = u.match(/wikidata\.org(?:\/wiki|\/entity)\/(Q\d+)/);
          if (m) wikidataId = m[1];
        }
        if (!wikiUrl && u.match(/en\.wikipedia\.org\/wiki\//)) {
          wikiUrl = u;
        }
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
          .then((wdData) => {
            const entity = wdData.entities?.[wikidataId!];
            const claims = entity?.claims;
            if (!claims) return;

            const p571 = claims.P571?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
            if (p571?.time) inception = p571.time.slice(1, 5);

            const p576 = claims.P576?.[0]?.mainsnak?.datavalue?.value as { time?: string } | undefined;
            if (p576?.time) dissolution = p576.time.slice(1, 5);

            const p154 = claims.P154?.[0]?.mainsnak?.datavalue?.value as string | undefined;
            if (typeof p154 === 'string' && p154) {
              const filename = p154.replace(/ /g, '_');
              logoUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
            }

            const p740 = claims.P740?.[0]?.mainsnak?.datavalue?.value as { id?: string } | undefined;
            if (p740?.id) formationLocationId = p740.id;
          })
          .catch(() => {})
      );
    }

    if (wikiUrl) {
      const title = decodeURIComponent(wikiUrl.split('/wiki/')[1] ?? '');
      parallel.push(
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
          headers: { 'User-Agent': UA },
        })
          .then(r => r.json() as Promise<WikipediaSummary>)
          .then((wpData) => {
            wikiBlurb = wpData.extract ?? null;
          })
          .catch(() => {})
      );
    }

    await Promise.all(parallel);

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

    return json({
      inception,
      dissolution,
      logoUrl,
      formationLocation,
      wikiBlurb,
      wikiUrl,
      currentMembers,
      originalMembers,
      formerMembers,
    });
  } catch {
    return json({ error: 'Failed to fetch artist info' }, 500);
  }
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface Member {
  name:         string;
  instruments:  string[];
  beginYear?:   string;
  endYear?:     string;
}

interface MBArtist {
  id:        string;
  name:      string;
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

interface WikidataResponse {
  entities: Record<string, {
    claims?: Record<string, Array<{
      mainsnak: {
        datavalue?: { value: unknown };
      };
    }>>;
  }>;
}

interface WikipediaSummary {
  extract?: string;
}
