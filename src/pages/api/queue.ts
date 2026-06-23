import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { invalidateLibraryOverview } from '../../lib/library-cache';
import { generateUniqueSlug, normalizeSearch } from '../../lib/utils';

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
