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

    // Fetch full tracklist
    const relRes = await fetch(
      `${MB}/release/${pick.id}?inc=recordings&fmt=json`,
      { headers: HDR }
    );
    if (!relRes.ok) return json([]);

    const rel = (await relRes.json()) as MBRelease;

    let pos = 0;
    const tracks = (rel.media ?? []).flatMap(m =>
      (m.tracks ?? []).map(t => ({
        pos:    ++pos,
        title:  t.title,
        length: t.length != null ? Math.round(t.length / 1000) : null,
        rating: null,
        note:   '',
      }))
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

interface MBReleaseSummary {
  id: string;
  status?: string;
}

interface MBRelease {
  media?: Array<{
    tracks?: Array<{
      position: number;
      title: string;
      length: number | null;
    }>;
  }>;
}
