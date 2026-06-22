import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Scalar fields that map 1:1 to DB columns
const SCALAR_COLS = ['disambiguation', 'inception', 'dissolution', 'formation_location', 'logo_url', 'wiki_blurb', 'wiki_url'] as const;
// JSON fields — stored as TEXT columns, must be stringified
const JSON_COLS   = ['aliases', 'members_data'] as const;

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

  // Build SET clause: always write overrides column, also apply each override to its column directly
  // so the page reflects changes immediately on reload without waiting for a syncArtistData run.
  const sets: string[]   = ['overrides = ?'];
  const vals: unknown[]  = [JSON.stringify(overrides)];

  for (const col of SCALAR_COLS) {
    if (col in overrides) { sets.push(`${col} = ?`); vals.push(overrides[col] ?? null); }
  }
  for (const col of JSON_COLS) {
    if (col in overrides) { sets.push(`${col} = ?`); vals.push(JSON.stringify(overrides[col])); }
  }

  vals.push(mbid);

  const db = env.DB;
  const result = await db.prepare(`UPDATE artists SET ${sets.join(', ')} WHERE mbid = ?`)
    .bind(...vals).run();

  if (!result.success) return new Response('DB error', { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
