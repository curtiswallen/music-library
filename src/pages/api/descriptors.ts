import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url, locals }) => {
  const q       = url.searchParams.get('q')?.trim() ?? '';
  const showAll = url.searchParams.get('all') === '1' && !!locals.user?.is_admin;

  const { results } = await env.DB.prepare(
    q
      ? `SELECT name, is_canonical FROM descriptors WHERE name LIKE ? COLLATE NOCASE${showAll ? '' : ' AND is_canonical = 1'} ORDER BY is_canonical DESC, name ASC LIMIT 50`
      : `SELECT name, is_canonical FROM descriptors WHERE ${showAll ? '1=1' : 'is_canonical = 1'} ORDER BY is_canonical DESC, name ASC LIMIT 500`
  ).bind(...(q ? [`%${q}%`] : [])).all<{ name: string; is_canonical: number }>();

  return json(results.map(r => r.name));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
