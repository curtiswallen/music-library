import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

interface ArtistCredit {
  artist?: { id: string; name: string };
  name?: string;
  joinphrase?: string;
}

function mapReleaseType(primary?: string, secondary: string[] = []): string | null {
  const sec = secondary.map(s => s.toLowerCase());
  if (sec.includes('demo'))        return 'demo';
  if (sec.includes('compilation')) return 'compilation';
  const p = (primary ?? '').toLowerCase();
  if (p === 'album')  return 'lp';
  if (p === 'ep')     return 'ep';
  if (p === 'single') return 'single';
  if (p)              return 'other';
  return null;
}

export const GET: APIRoute = async ({ url }) => {
  const rgId = url.searchParams.get('id')?.trim();
  if (!rgId) return json(null, 400);

  try {
    const res = await fetch(
      `${MB}/release-group/${encodeURIComponent(rgId)}?inc=artist-credits&fmt=json`,
      { headers: HDR }
    );
    if (!res.ok) return json(null, res.status === 404 ? 404 : 502);

    const rg = await res.json() as {
      title: string;
      'first-release-date'?: string;
      'primary-type'?: string;
      'secondary-types'?: string[];
      'artist-credit'?: ArtistCredit[];
    };

    const credits = rg['artist-credit'] ?? [];
    const artist  = credits.map(c => (c.name ?? c.artist?.name ?? '') + (c.joinphrase ?? '')).join('');
    const artists = credits.filter(c => c.artist?.name).map(c => c.name ?? c.artist!.name);
    const artistMbid  = credits[0]?.artist?.id ?? null;
    const year        = rg['first-release-date']?.slice(0, 4) || null;
    const releaseType = mapReleaseType(rg['primary-type'], rg['secondary-types']);

    // Use existing canonical cover from DB if available; otherwise try CAA
    const db = env.DB;
    const dbAlbum = await db.prepare('SELECT cover_url FROM albums WHERE mbid = ?')
      .bind(rgId).first<{ cover_url: string | null }>();
    const coverUrl = dbAlbum?.cover_url || `https://coverartarchive.org/release-group/${rgId}/front-500`;

    return json({ title: rg.title, artist, artists, year, releaseType, artistMbid, coverUrl });
  } catch {
    return json(null, 500);
  }
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
