import type { APIRoute } from 'astro';

const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

export const GET: APIRoute = async ({ url }) => {
  const rgId = url.searchParams.get('rgId')?.trim();
  if (!rgId) return json([]);

  try {
    const res = await fetch(
      `${MB}/release?release-group=${rgId}&fmt=json&limit=25&inc=media`,
      { headers: HDR }
    );
    if (!res.ok) return json([]);

    const data = (await res.json()) as { releases?: MBRelease[] };
    const releases = (data.releases ?? []).filter(r => !r.status || r.status === 'Official');
    if (releases.length < 2) return json([]);

    return json(releases.map(r => ({ id: r.id, label: buildLabel(r) })));
  } catch {
    return json([]);
  }
};

function buildLabel(r: MBRelease): string {
  if (r.disambiguation) return r.disambiguation;
  const parts: string[] = [];
  if (r.date) parts.push(r.date.slice(0, 4));
  if (r.country === 'XW') {
    parts.push('Worldwide');
  } else if (r.country) {
    parts.push(ISO_NAMES[r.country] ?? r.country);
  }
  const formats = [...new Set((r.media ?? []).map(m => m.format).filter((f): f is string => !!f))];
  if (formats.length) parts.push(formats.join('+'));
  return parts.join(' · ') || r.id.slice(0, 8);
}

const ISO_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany',  FR: 'France',
  JP: 'Japan',         CA: 'Canada',         AU: 'Australia', NO: 'Norway',
  SE: 'Sweden',        FI: 'Finland',        DK: 'Denmark',   NL: 'Netherlands',
  BE: 'Belgium',       AT: 'Austria',        CH: 'Switzerland', IT: 'Italy',
  ES: 'Spain',         PL: 'Poland',         CZ: 'Czech Republic', SK: 'Slovakia',
  RU: 'Russia',        UA: 'Ukraine',        BR: 'Brazil',    AR: 'Argentina',
  MX: 'Mexico',        GR: 'Greece',         HU: 'Hungary',   RO: 'Romania',
  PT: 'Portugal',      KR: 'South Korea',    ZA: 'South Africa',
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

interface MBRelease {
  id: string;
  status?: string;
  date?: string;
  country?: string;
  disambiguation?: string;
  media?: Array<{ format?: string }>;
}
