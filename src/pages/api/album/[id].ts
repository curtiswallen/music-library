import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { invalidateLibraryOverview } from '../../../lib/library-cache';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id     = parseInt(params.id ?? '');
  const userId = locals.user?.id;
  if (!id || !userId) return new Response('Invalid', { status: 400 });

  // Only subtract duration for rated entries; unrated/queued entries were never counted
  await env.DB.prepare(`
    UPDATE users SET total_seconds = total_seconds
      - COALESCE((SELECT COALESCE(track_seconds, 0) FROM user_albums WHERE album_id = ? AND user_id = ? AND rating IS NOT NULL LIMIT 1), 0)
    WHERE id = ?
  `).bind(id, userId, userId).run();

  // Atomically remove all per-user data for this album
  await env.DB.batch([
    env.DB.prepare('DELETE FROM track_ratings WHERE album_id = ? AND user_id = ?').bind(id, userId),
    env.DB.prepare('DELETE FROM user_album_subgenres WHERE album_id = ? AND user_id = ?').bind(id, userId),
    env.DB.prepare('DELETE FROM user_album_descriptors WHERE album_id = ? AND user_id = ?').bind(id, userId),
    env.DB.prepare('DELETE FROM user_albums WHERE album_id = ? AND user_id = ?').bind(id, userId),
  ]);

  // Clean up orphaned canonical album, or update logged_by_user_ids
  const remaining = await env.DB.prepare('SELECT COUNT(*) as c FROM user_albums WHERE album_id = ?')
    .bind(id).first<{ c: number }>();
  if (Number(remaining?.c ?? 0) === 0) {
    await env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare(`
      UPDATE albums SET
        logged_by_user_ids = (SELECT json_group_array(user_id) FROM user_albums WHERE album_id = ? AND (is_queued = 0 OR is_queued IS NULL)),
        all_subgenres      = COALESCE((SELECT json_group_array(subgenre)    FROM (SELECT DISTINCT subgenre    FROM user_album_subgenres  WHERE album_id = ?)), '[]'),
        all_descriptors    = COALESCE((SELECT json_group_array(descriptor)  FROM (SELECT DISTINCT descriptor  FROM user_album_descriptors WHERE album_id = ?)), '[]'),
        genre_counts       = COALESCE((SELECT json_group_object(genre, cnt) FROM (SELECT genre, COUNT(*) as cnt FROM user_albums WHERE album_id = ? AND genre != '' GROUP BY genre)), '{}'),
        subgenre_counts    = COALESCE((SELECT json_group_object(subgenre, cnt)    FROM (SELECT subgenre,    COUNT(*) as cnt FROM user_album_subgenres  WHERE album_id = ? GROUP BY subgenre)),    '{}'),
        descriptor_counts  = COALESCE((SELECT json_group_object(descriptor, cnt) FROM (SELECT descriptor,  COUNT(*) as cnt FROM user_album_descriptors WHERE album_id = ? GROUP BY descriptor)),  '{}'),
        avg_rating         = (SELECT AVG(rating)   FROM user_albums WHERE album_id = ? AND rating IS NOT NULL),
        rating_count       = (SELECT COUNT(rating) FROM user_albums WHERE album_id = ? AND rating IS NOT NULL)
      WHERE id = ?
    `).bind(id, id, id, id, id, id, id, id, id).run();
  }

  await invalidateLibraryOverview(env.GENRE_CACHE, userId);

  return new Response(null, { status: 204 });
};
