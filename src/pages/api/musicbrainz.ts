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

  // DB-first: albums added by other users, not yet in this user's library
  try {
    const like = `%${q}%`;
    const rows = userId
      ? await env.DB
          .prepare(
            `SELECT id, artist, album, year, country, cover_url, mbid, tracks
             FROM albums
             WHERE (artist LIKE ? OR album LIKE ?)
               AND id NOT IN (SELECT album_id FROM user_albums WHERE user_id = ?)
             LIMIT 3`
          )
          .bind(like, like, userId)
          .all<DBRow>()
      : await env.DB
          .prepare(
            `SELECT id, artist, album, year, country, cover_url, mbid, tracks
             FROM albums
             WHERE artist LIKE ? OR album LIKE ?
             LIMIT 3`
          )
          .bind(like, like)
          .all<DBRow>();

    for (const row of rows.results ?? []) {
      if (row.mbid) seenMbids.add(row.mbid);
      let dbTracks: DBTrack[] | undefined;
      try { dbTracks = JSON.parse(row.tracks || '[]'); } catch {}
      results.push({
        mbid:     row.mbid ?? '',
        title:    row.album,
        artist:   row.artist,
        artists:  row.artist.split(' / ').map((s: string) => s.trim()).filter(Boolean),
        artistId: '',
        year:     row.year ? String(row.year) : '',
        tags:     [],
        coverUrl: row.cover_url ?? (row.mbid ? `https://coverartarchive.org/release-group/${row.mbid}/front-250` : ''),
        dbId:     row.id,
        country:  row.country ?? '',
        fromDb:   true,
        dbTracks: dbTracks?.length ? dbTracks : undefined,
      });
    }
  } catch { /* DB unavailable — continue with MB only */ }

  // MusicBrainz search (skip MBIDs already returned from DB)
  try {
    const res = await fetch(
      `${MB}/release-group?query=${encodeURIComponent(q)}&type=album&fmt=json&limit=8&inc=genres`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    if (res.ok) {
      const data = (await res.json()) as MBResponse;
      for (const rg of (data['release-groups'] ?? []).slice(0, 8)) {
        if (seenMbids.has(rg.id)) continue;
        const ac = rg['artist-credit'] ?? [];
        const artist = ac.map(c => (c.artist?.name ?? '') + (c.joinphrase ?? '')).join('').trim()
          || (ac[0]?.artist?.name ?? '');
        results.push({
          mbid:     rg.id,
          title:    rg.title,
          artist,
          artists:  ac.map(c => c.artist?.name ?? '').filter(Boolean),
          artistId: ac[0]?.artist?.id ?? '',
          year:     rg['first-release-date']?.slice(0, 4) ?? '',
          tags:     (rg.genres ?? rg.tags ?? [])
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 3)
                      .map(t => t.name),
          coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
        });
      }
    }
  } catch { /* MB unavailable */ }

  return json(results.slice(0, 10));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

interface SearchResult {
  mbid: string;
  title: string;
  artist: string;
  artists: string[];
  artistId: string;
  year: string;
  tags: string[];
  coverUrl: string;
  dbId?: number;
  country?: string;
  fromDb?: boolean;
  dbTracks?: DBTrack[];
}

interface DBTrack {
  pos: number;
  title: string;
  length: number | null;
}

interface DBRow {
  id: number;
  artist: string;
  album: string;
  year: number | null;
  country: string;
  cover_url: string | null;
  mbid: string | null;
  tracks: string;
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
