import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return json([]);

  const { results } = await env.DB.prepare(
    `SELECT name FROM descriptors WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT 10`
  ).bind(`%${q}%`).all<{ name: string }>();

  return json(results.map(r => r.name));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
