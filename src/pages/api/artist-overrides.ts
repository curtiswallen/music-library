import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user?.is_admin) return new Response('Forbidden', { status: 403 });

  let body: { mbid: string; overrides: Record<string, unknown> };
  try {
    body = await request.json() as typeof body;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { mbid, overrides } = body;
  if (!mbid || typeof mbid !== 'string') return new Response('Bad request', { status: 400 });

  const db = env.DB;
  const result = await db.prepare('UPDATE artists SET overrides = ? WHERE mbid = ?')
    .bind(JSON.stringify(overrides), mbid).run();

  if (!result.success) return new Response('DB error', { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
