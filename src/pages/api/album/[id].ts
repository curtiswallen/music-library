import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const id     = parseInt(params.id ?? '');
  const userId = locals.user?.id;
  if (!id || !userId) return new Response('Invalid', { status: 400 });

  await env.DB.prepare('DELETE FROM user_albums WHERE album_id = ? AND user_id = ?')
    .bind(id, userId).run();

  // Clean up orphaned canonical album (no other users have it)
  const remaining = await env.DB.prepare('SELECT COUNT(*) as c FROM user_albums WHERE album_id = ?')
    .bind(id).first<{ c: number }>();
  if (Number(remaining?.c ?? 0) === 0) {
    await env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id).run();
  }

  return new Response(null, { status: 204 });
};
