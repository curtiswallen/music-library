import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { invalidateLibraryOverview } from '../../lib/library-cache';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(null, { status: 401 });

  const db = env.DB;
  let albumId: number;
  try {
    const body = await request.json() as { albumId?: unknown };
    albumId = Number(body.albumId);
    if (!Number.isInteger(albumId) || albumId <= 0) throw new Error();
  } catch {
    return new Response('Invalid albumId', { status: 400 });
  }

  const album = await db.prepare('SELECT id FROM albums WHERE id = ?')
    .bind(albumId).first<{ id: number }>();
  if (!album) return new Response('Album not found', { status: 404 });

  const existing = await db.prepare(
    'SELECT is_queued FROM user_albums WHERE album_id = ? AND user_id = ?'
  ).bind(albumId, user.id).first<{ is_queued: number }>();

  if (existing) {
    const status = existing.is_queued ? 'queued' : 'logged';
    return new Response(JSON.stringify({ status }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.prepare('INSERT INTO user_albums (user_id, album_id, is_queued) VALUES (?, ?, 1)')
    .bind(user.id, albumId).run();

  await invalidateLibraryOverview(env.GENRE_CACHE, user.id);

  return new Response(JSON.stringify({ status: 'queued' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
