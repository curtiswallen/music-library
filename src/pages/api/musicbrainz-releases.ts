import type { APIRoute } from 'astro';

const MB  = 'https://musicbrainz.org/ws/2';
const UA  = 'MusicLibraryApp/0.1';
const HDR = { 'User-Agent': UA, Accept: 'application/json' };

export const GET: APIRoute = async ({ url }) => {
  const rgId = url.searchParams.get('rgId')?.trim();
  if (!rgId) return json([]);

  try {
    const res = await fetch(
      `${MB}/release?release-group=${rgId}&fmt=json&limit=25&inc=media+labels`,
      { headers: HDR }
    );
    if (!res.ok) return json([]);

    const data = (await res.json()) as { releases?: MBRelease[] };
    const releases = (data.releases ?? [])
      .filter(r => !r.status || r.status === 'Official')
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    if (!releases.length) return json([]);

    return json(releases.map(r => ({
      id:    r.id,
      label: buildLabel(r),
      data:  buildData(r),
    })));
  } catch {
    return json([]);
  }
};

function buildLabel(r: MBRelease): string {
  const parts: string[] = [];
  const formats = [...new Set((r.media ?? []).map(m => m.format).filter((f): f is string => !!f))];
  if (formats.length) parts.push(formats.join('+'));
  if (r.disambiguation) parts.push(r.disambiguation);
  if (r.date) parts.push(r.date.slice(0, 4));
  if (r.country === 'XW') parts.push('Worldwide');
  else if (r.country) parts.push(ISO_NAMES[r.country] ?? r.country);
  return parts.join(' · ') || r.id.slice(0, 8);
}

function buildData(r: MBRelease): ReleaseData {
  const formats    = [...new Set((r.media ?? []).map(m => m.format).filter((f): f is string => !!f))];
  const trackCount = (r.media ?? []).reduce((n, m) => n + (m['track-count'] ?? 0), 0);
  const labelInfo  = (r['label-info'] ?? []).filter(li => li.label?.name);
  return {
    format:         formats.join(' + '),
    date:           r.date           ?? '',
    country:        r.country        ?? '',
    disambiguation: r.disambiguation ?? '',
    barcode:        r.barcode        ?? '',
    trackCount,
    labels: labelInfo.map(li => ({
      name:    li.label!.name!,
      catalog: li['catalog-number'] ?? '',
    })),
  };
}

export interface ReleaseData {
  format:         string;
  date:           string;
  country:        string;
  disambiguation: string;
  barcode:        string;
  trackCount:     number;
  labels:         Array<{ name: string; catalog: string }>;
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
  id:             string;
  status?:        string;
  date?:          string;
  country?:       string;
  disambiguation?: string;
  barcode?:       string;
  media?:         Array<{ format?: string; 'track-count'?: number }>;
  'label-info'?:  Array<{
    'catalog-number'?: string;
    label?: { name?: string };
  }>;
}
