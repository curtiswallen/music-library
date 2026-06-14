import type { APIRoute } from 'astro';

const MB = 'https://musicbrainz.org/ws/2';
const UA = 'MusicLibraryApp/0.1';

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return json([]);

  try {
    const res = await fetch(
      `${MB}/release-group?query=${encodeURIComponent(q)}&type=album&fmt=json&limit=8&inc=genres`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    if (!res.ok) return json([]);

    const data = (await res.json()) as MBResponse;

    const results = (data['release-groups'] ?? []).slice(0, 8).map(rg => ({
      mbid:     rg.id,
      title:    rg.title,
      artist:   rg['artist-credit']?.[0]?.artist?.name ?? '',
      artistId: rg['artist-credit']?.[0]?.artist?.id ?? '',
      year:     rg['first-release-date']?.slice(0, 4) ?? '',
      tags:     (rg.genres ?? rg.tags ?? [])
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 3)
                  .map(t => t.name),
      coverUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
    }));

    return json(results);
  } catch {
    return json([]);
  }
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

interface MBResponse {
  'release-groups'?: Array<{
    id: string;
    title: string;
    'first-release-date'?: string;
    'artist-credit'?: Array<{ artist: { id: string; name: string } }>;
    genres?: Array<{ name: string; count: number }>;
    tags?:   Array<{ name: string; count: number }>;
  }>;
}
