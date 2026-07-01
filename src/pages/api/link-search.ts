import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const GET: APIRoute = async ({ url }) => {
  const db = env.DB;
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
  }
  const like = `%${q}%`;

  const [artistRes, albumRes] = await Promise.all([
    db.prepare(`
      SELECT artist as name FROM albums
      WHERE LOWER(artist) LIKE LOWER(?)
      GROUP BY LOWER(artist) ORDER BY artist LIMIT 5
    `).bind(like).all<{ name: string }>(),
    db.prepare(`
      SELECT album as name, slug FROM albums
      WHERE LOWER(album) LIKE LOWER(?)
      ORDER BY album LIMIT 5
    `).bind(like).all<{ name: string; slug: string }>(),
  ]);

  const results = [
    ...artistRes.results.map(r => ({
      type: 'artist',
      name: r.name,
      url: `/artist/${slugify(r.name)}`,
    })),
    ...albumRes.results.map(r => ({
      type: 'album',
      name: r.name,
      url: `/album/${r.slug}`,
    })),
  ];

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
