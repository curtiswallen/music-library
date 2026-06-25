import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { invalidateLibraryOverview } from '../../lib/library-cache';
import { generateUniqueSlug, normalizeSearch, countryName } from '../../lib/utils';

const MB  = 'https://musicbrainz.org/ws/2';
const HDR = { 'User-Agent': 'MusicLibraryApp/0.1', Accept: 'application/json' };

interface ArtistCredit {
  artist?: { id: string; name: string };
  name?: string;
  joinphrase?: string;
}

async function prefetchTracksAndCountry(
  db: D1Database,
  albumId: number,
  mbid: string,
  artistMbid: string,
): Promise<void> {
  try {
    const [relListRes, artistRes] = await Promise.all([
      fetch(`${MB}/release?release-group=${encodeURIComponent(mbid)}&fmt=json&limit=10`, { headers: HDR }),
      fetch(`${MB}/artist/${encodeURIComponent(artistMbid)}?fmt=json`, { headers: HDR }),
    ]);

    let country = '';
    if (artistRes.ok) {
      const a = await artistRes.json() as { country?: string; area?: { 'iso-3166-1-codes'?: string[] } };
      const iso = a.country || a.area?.['iso-3166-1-codes']?.[0] || '';
      country = iso ? (countryName(iso) || iso) : '';
    }

    let tracksJson = '[]';
    if (relListRes.ok) {
      const relList = await relListRes.json() as { releases?: { id: string; status?: string }[] };
      const pick = relList.releases?.find(r => r.status === 'Official') ?? relList.releases?.[0];
      if (pick) {
        const relRes = await fetch(
          `${MB}/release/${pick.id}?inc=recordings+artist-credits&fmt=json`,
          { headers: HDR },
        );
        if (relRes.ok) {
          const rel = await relRes.json() as {
            'artist-credit'?: ArtistCredit[];
            media?: Array<{ tracks?: Array<{ title: string; length: number | null; recording?: { 'artist-credit'?: ArtistCredit[] } }> }>;
          };
          const isSplit = (rel['artist-credit'] ?? []).length > 1;
          let pos = 0;
          const tracks = (rel.media ?? []).flatMap(m =>
            (m.tracks ?? []).map(t => {
              let title = t.title;
              const ac = t.recording?.['artist-credit'] ?? [];
              if (isSplit) {
                const ta = ac.map(c => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('').trim();
                if (ta) title = `${ta} - ${title}`;
              } else if (ac.length > 1) {
                const feat = (ac[0].joinphrase ?? '') + ac.slice(1).map(c => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('');
                if (feat.trim()) title = title + feat;
              }
              return { pos: ++pos, title, length: t.length != null ? Math.round(t.length / 1000) : null };
            }),
          );
          tracksJson = JSON.stringify(tracks);
        }
      }
    }

    if (tracksJson !== '[]' || country) {
      await db.prepare(`
        UPDATE albums SET
          tracks  = CASE WHEN tracks  = '[]' THEN ? ELSE tracks  END,
          country = CASE WHEN country = ''   THEN ? ELSE country END
        WHERE id = ?
      `).bind(tracksJson, country, albumId).run();
    }
  } catch {
    // Background prefetch — silently ignore errors
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(null, { status: 401 });

  const db = env.DB;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  let albumId: number;
  let albumSlug: string;

  if (body.albumId != null) {
    // Queue by existing DB id
    albumId = Number(body.albumId);
    if (!Number.isInteger(albumId) || albumId <= 0)
      return new Response('Invalid albumId', { status: 400 });

    const row = await db.prepare('SELECT id, slug FROM albums WHERE id = ?')
      .bind(albumId).first<{ id: number; slug: string }>();
    if (!row) return new Response('Album not found', { status: 404 });
    albumSlug = row.slug;
  } else {
    // Find or create album from MB / manual data
    const mbid       = typeof body.mbid       === 'string' ? body.mbid       : null;
    const title      = typeof body.title      === 'string' ? body.title.trim()  : '';
    const artist     = typeof body.artist     === 'string' ? body.artist.trim() : '';
    if (!title || !artist) return new Response('title and artist required', { status: 400 });

    const year        = body.year        != null ? (parseInt(String(body.year), 10) || null) : null;
    const coverUrl    = typeof body.coverUrl    === 'string' ? body.coverUrl    : null;
    const releaseType = typeof body.releaseType === 'string' ? body.releaseType : null;
    const artistMbid  = typeof body.artistMbid  === 'string' ? body.artistMbid  : null;

    if (mbid) {
      const row = await db.prepare('SELECT id, slug FROM albums WHERE mbid = ?')
        .bind(mbid).first<{ id: number; slug: string }>();
      if (row) {
        albumId = row.id; albumSlug = row.slug;
      } else {
        albumSlug = await generateUniqueSlug(db, artist, title);
        const r = await db.prepare(`
          INSERT INTO albums (mbid, slug, artist, album, country, year, cover_url, tracks, search_text, artist_mbid, release_type)
          VALUES (?, ?, ?, ?, '', ?, ?, '[]', ?, ?, ?)
        `).bind(mbid, albumSlug, artist, title, year, coverUrl,
          normalizeSearch(`${artist} ${title}`), artistMbid, releaseType).run();
        albumId = r.meta.last_row_id as number;
        if (artistMbid) {
          locals.cfContext.waitUntil(prefetchTracksAndCountry(db, albumId, mbid, artistMbid));
        }
      }
    } else {
      const row = await db.prepare(
        'SELECT id, slug FROM albums WHERE LOWER(artist) = LOWER(?) AND LOWER(album) = LOWER(?)'
      ).bind(artist, title).first<{ id: number; slug: string }>();
      if (row) {
        albumId = row.id; albumSlug = row.slug;
      } else {
        albumSlug = await generateUniqueSlug(db, artist, title);
        const r = await db.prepare(`
          INSERT INTO albums (mbid, slug, artist, album, country, year, cover_url, tracks, search_text, artist_mbid, release_type)
          VALUES (NULL, ?, ?, ?, '', ?, ?, '[]', ?, ?, ?)
        `).bind(albumSlug, artist, title, year, coverUrl,
          normalizeSearch(`${artist} ${title}`), artistMbid, releaseType).run();
        albumId = r.meta.last_row_id as number;
      }
    }
  }

  const existing = await db.prepare(
    'SELECT is_queued FROM user_albums WHERE album_id = ? AND user_id = ?'
  ).bind(albumId, user.id).first<{ is_queued: number }>();

  if (existing) {
    const status = existing.is_queued ? 'queued' : 'logged';
    return new Response(JSON.stringify({ status, slug: albumSlug!, albumId }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.prepare('INSERT INTO user_albums (user_id, album_id, is_queued) VALUES (?, ?, 1)')
    .bind(user.id, albumId).run();

  await invalidateLibraryOverview(env.GENRE_CACHE, user.id);

  return new Response(JSON.stringify({ status: 'queued', slug: albumSlug!, albumId }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
