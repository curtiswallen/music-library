import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const DELETE: APIRoute = async ({ params }) => {
  const id = parseInt(params.id ?? '');
  if (!id) return new Response('Invalid ID', { status: 400 });

  await env.DB.prepare('DELETE FROM albums WHERE id = ?').bind(id).run();
  return new Response(null, { status: 204 });
};
