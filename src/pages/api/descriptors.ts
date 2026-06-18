import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';

  const { results } = await env.DB.prepare(
    q
      ? `SELECT name FROM descriptors WHERE name LIKE ? COLLATE NOCASE ORDER BY name ASC LIMIT 10`
      : `SELECT name FROM descriptors ORDER BY name ASC LIMIT 20`
  ).bind(...(q ? [`%${q}%`] : [])).all<{ name: string }>();

  return json(results.map(r => r.name));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
