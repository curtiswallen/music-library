import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const MB = 'https://musicbrainz.org/ws/2';
const UA = 'MusicLibraryApp/0.1';

export const GET: APIRoute = async (context) => {
  const { url, locals } = context;
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return json([]);

  const userId = locals.user?.id ?? null;
  const results: SearchResult[] = [];
  const seenMbids = new Set<string>();

  // DB-first: all matching albums, flagged if already in this user's library
  try {
    const like = `%${q}%`;
    const rows = userId
      ? await env.DB
          .prepare(
            `SELECT a.id, a.artist, a.album, a.year, a.country, a.cover_url, a.mbid, a.tracks, a.slug,
                    CASE WHEN ua.album_id IS NOT NULL THEN 1 ELSE 0 END AS in_library
             FROM albums a
             LEFT JOIN user_albums ua ON ua.album_id = a.id AND ua.user_id = ?
             WHERE (a.artist LIKE ? OR a.album LIKE ?)
             ORDER BY CASE WHEN ua.album_id IS NOT NULL THEN 1 ELSE 0 END ASC,
                      CASE WHEN a.artist LIKE ? THEN 0 ELSE 1 END
             LIMIT 5`
          )
          .bind(userId, like, like, like)
          .all<DBRow>()
      : await env.DB
          .prepare(
            `SELECT id, artist, album, year, country, cover_url, mbid, tracks, slug, 0 AS in_library
             FROM albums
             WHERE artist LIKE ? OR album LIKE ?
             ORDER BY CASE WHEN artist LIKE ? THEN 0 ELSE 1 END
             LIMIT 5`
          )
          .bind(like, like, like)
          .all<DBRow>();

    for (const row of rows.results ?? []) {
      if (row.mbid) seenMbids.add(row.mbid);
      let dbTracks: DBTrack[] | undefined;
      try { dbTracks = JSON.parse(row.tracks || '[]'); } catch {}
      results.push({
        mbid:      row.mbid ?? '',
        title:     row.album,
        artist:    row.artist,
        artists:   row.artist.split(' / ').map((s: string) => s.trim()).filter(Boolean),
        artistId:  '',
        year:      row.year ? String(row.year) : '',
        tags:      [],
        coverUrl:  row.cover_url ?? (row.mbid ? `https://coverartarchive.org/release-group/${row.mbid}/front-250` : ''),
        dbId:      row.id,
        country:   row.country ?? '',
        slug:      row.slug,
        fromDb:    true,
        inLibrary: row.in_library === 1,
        dbTracks:  dbTracks?.length ? dbTracks : undefined,
      });
    }
  } catch { /* DB unavailable — continue with MB only */ }

  // MusicBrainz search — artist-name query first, then general title query (parallel)
  const mbResults: SearchResult[] = [];
  try {
    const HDR = { 'User-Agent': UA, Accept: 'application/json' };
    const enc = encodeURIComponent;
    const [artistRes, titleRes] = await Promise.all([
      fetch(`${MB}/release-group?query=artist:${enc(q)}&type=album&fmt=json&limit=8&inc=genres`, { headers: HDR }),
      fetch(`${MB}/release-group?query=${enc(q)}&type=album&fmt=json&limit=5&inc=genres`,        { headers: HDR }),
    ]);
    const artistRgs = artistRes.ok ? ((await artistRes.json()) as MBResponse)['release-groups'] ?? [] : [];
    const titleRgs  = titleRes.ok  ? ((await titleRes.json())  as MBResponse)['release-groups'] ?? [] : [];

    for (const rg of [...artistRgs.slice(0, 8), ...titleRgs.slice(0, 5)]) {
      if (seenMbids.has(rg.id)) continue;
      seenMbids.add(rg.id);
      const ac = rg['artist-credit'] ?? [];
      const artist = ac.map(c => (c.artist?.name ?? '') + (c.joinphrase ?? '')).join('').trim()
        || (ac[0]?.artist?.name ?? '');
      mbResults.push({
        mbid:      rg.id,
        title:     rg.title,
        artist,
        artists:   ac.map(c => c.artist?.name ?? '').filter(Boolean),
        artistId:  ac[0]?.artist?.id ?? '',
        year:      rg['first-release-date']?.slice(0, 4) ?? '',
        tags:      (rg.genres ?? rg.tags ?? [])
                     .sort((a, b) => b.count - a.count)
                     .slice(0, 8)
                     .map(t => t.name),
        coverUrl:  `https://coverartarchive.org/release-group/${rg.id}/front-250`,
        inLibrary: false,
      });
    }
  } catch { /* MB unavailable */ }

  // Check which MB results are already in this user's library
  if (userId && mbResults.length > 0) {
    const mbids = mbResults.map(r => r.mbid).filter(Boolean);
    if (mbids.length > 0) {
      try {
        const placeholders = mbids.map(() => '?').join(', ');
        const { results: libRows } = await env.DB.prepare(
          `SELECT a.mbid, a.slug FROM albums a
           JOIN user_albums ua ON ua.album_id = a.id AND ua.user_id = ?
           WHERE a.mbid IN (${placeholders})`
        ).bind(userId, ...mbids).all<{ mbid: string; slug: string }>();
        const libMap = new Map(libRows.map(r => [r.mbid, r.slug]));
        for (const r of mbResults) {
          if (r.mbid && libMap.has(r.mbid)) {
            r.inLibrary = true;
            r.slug = libMap.get(r.mbid);
          }
        }
      } catch {}
    }
  }

  results.push(...mbResults);
  return json(results.slice(0, 10));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

interface SearchResult {
  mbid:      string;
  title:     string;
  artist:    string;
  artists:   string[];
  artistId:  string;
  year:      string;
  tags:      string[];
  coverUrl:  string;
  dbId?:     number;
  country?:  string;
  slug?:     string;
  fromDb?:   boolean;
  inLibrary?: boolean;
  dbTracks?: DBTrack[];
}

interface DBTrack {
  pos:    number;
  title:  string;
  length: number | null;
}

interface DBRow {
  id:         number;
  artist:     string;
  album:      string;
  year:       number | null;
  country:    string;
  cover_url:  string | null;
  mbid:       string | null;
  tracks:     string;
  slug:       string;
  in_library: number;
}

interface MBResponse {
  'release-groups'?: Array<{
    id: string;
    title: string;
    'first-release-date'?: string;
    'artist-credit'?: Array<{ artist: { id: string; name: string }; joinphrase?: string }>;
    genres?: Array<{ name: string; count: number }>;
    tags?:   Array<{ name: string; count: number }>;
  }>;
}
