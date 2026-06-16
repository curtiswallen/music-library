import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url }) => {
  const q     = url.searchParams.get('q')?.trim()     ?? '';
  const genre = url.searchParams.get('genre')?.trim() ?? '';

  // With a text filter: match by name, sort genre-frequent first
  if (q) {
    const { results } = await env.DB.prepare(`
      SELECT d.name
      FROM descriptors d
      LEFT JOIN user_albums ua
        ON ua.genre = ? AND ua.descriptors LIKE '%"' || d.name || '"%'
      WHERE d.name LIKE ? COLLATE NOCASE
      GROUP BY d.name
      ORDER BY COUNT(ua.id) DESC, d.name ASC
      LIMIT 10
    `).bind(genre, `%${q}%`).all<{ name: string }>();
    return json(results.map(r => r.name));
  }

  // No text filter: show top descriptors for this genre (or alphabetically if no genre)
  const { results } = await env.DB.prepare(`
    SELECT d.name
    FROM descriptors d
    LEFT JOIN user_albums ua
      ON ua.genre = ? AND ua.descriptors LIKE '%"' || d.name || '"%'
    GROUP BY d.name
    ORDER BY COUNT(ua.id) DESC, d.name ASC
    LIMIT 20
  `).bind(genre).all<{ name: string }>();
  return json(results.map(r => r.name));
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
