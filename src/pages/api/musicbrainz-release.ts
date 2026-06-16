import type { APIRoute } from 'astro';

const MB = 'https://musicbrainz.org/ws/2';
const UA = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

export const GET: APIRoute = async ({ url }) => {
  const rgId = url.searchParams.get('id')?.trim();
  if (!rgId) return json([]);

  try {
    // Get releases in this release-group
    const rgRes = await fetch(
      `${MB}/release?release-group=${rgId}&fmt=json&limit=10`,
      { headers: HDR }
    );
    if (!rgRes.ok) return json([]);

    const rgData = (await rgRes.json()) as { releases?: MBReleaseSummary[] };
    const releases = rgData.releases ?? [];
    if (!releases.length) return json([]);

    // Prefer "Official" release; fall back to first
    const pick = releases.find(r => r.status === 'Official') ?? releases[0];

    // Fetch full tracklist including per-track artist credits
    const relRes = await fetch(
      `${MB}/release/${pick.id}?inc=recordings+artist-credits&fmt=json`,
      { headers: HDR }
    );
    if (!relRes.ok) return json([]);

    const rel = (await relRes.json()) as MBRelease;

    // Split album: release has more than one top-level artist credit
    const isSplit = (rel['artist-credit'] ?? []).length > 1;

    let pos = 0;
    const tracks = (rel.media ?? []).flatMap(m =>
      (m.tracks ?? []).map(t => {
        let title = t.title;
        if (isSplit) {
          const ac = t.recording?.['artist-credit'] ?? [];
          const trackArtist = ac
            .map(c => (c.artist?.name ?? '') + (c.joinphrase ?? ''))
            .join('')
            .trim();
          if (trackArtist) title = `${trackArtist} - ${title}`;
        }
        return {
          pos:    ++pos,
          title,
          length: t.length != null ? Math.round(t.length / 1000) : null,
          rating: null,
          note:   '',
        };
      })
    );

    return json(tracks);
  } catch {
    return json([]);
  }
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

interface ArtistCredit {
  artist?: { id: string; name: string };
  joinphrase?: string;
}

interface MBReleaseSummary {
  id: string;
  status?: string;
}

interface MBRelease {
  'artist-credit'?: ArtistCredit[];
  media?: Array<{
    tracks?: Array<{
      position: number;
      title: string;
      length: number | null;
      recording?: {
        'artist-credit'?: ArtistCredit[];
      };
    }>;
  }>;
}
