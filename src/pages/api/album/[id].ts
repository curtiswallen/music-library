import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { invalidateLibraryOverview } from '../../../lib/library-cache';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id     = parseInt(params.id ?? '');
  const userId = locals.user?.id;
  if (!id || !userId) return new Response('Invalid', { status: 400 });

  await env.DB.prepare('DELETE FROM user_albums WHERE album_id = ? AND user_id = ?')
    .bind(id, userId).run();

  // Clean up orphaned canonical album, or update logged_by_user_ids
  const remaining = await env.DB.prepare('SELECT COUNT(*) as c FROM user_albums WHERE album_id = ?')
    .bind(id).first<{ c: number }>();
  if (Number(remaining?.c ?? 0) === 0) {
    await env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id).run();
  } else {
    await env.DB.prepare(`
      UPDATE albums SET
        logged_by_user_ids = (SELECT json_group_array(user_id) FROM user_albums WHERE album_id = ?),
        all_subgenres  = COALESCE((SELECT json_group_array(value) FROM (SELECT DISTINCT value FROM user_albums, json_each(user_albums.subgenres)  WHERE user_albums.album_id = ?)), '[]'),
        all_descriptors = COALESCE((SELECT json_group_array(value) FROM (SELECT DISTINCT value FROM user_albums, json_each(user_albums.descriptors) WHERE user_albums.album_id = ?)), '[]')
      WHERE id = ?
    `).bind(id, id, id, id).run();
  }

  await invalidateLibraryOverview(env.GENRE_CACHE, userId);

  return new Response(null, { status: 204 });
};
