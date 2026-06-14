import type { APIRoute } from 'astro';
import { countryName } from '../../lib/utils';

const MB = 'https://musicbrainz.org/ws/2';
const UA = 'MusicLibraryApp/0.1';

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id')?.trim();
  if (!id) return json({ country: '' });

  try {
    const res = await fetch(
      `${MB}/artist/${encodeURIComponent(id)}?fmt=json`,
      { headers: { 'User-Agent': UA, Accept: 'application/json' } }
    );
    if (!res.ok) return json({ country: '' });

    const data = (await res.json()) as MBArtist;

    // `data.country` is always the ISO-3166-1 code at country level (e.g. "CA" for a
    // band from Quebec). `area` may be a city or province, so we only fall back to it
    // when it carries an explicit ISO code — never a bare area name like "Quebec".
    const isoCode =
      data.country ||
      data.area?.['iso-3166-1-codes']?.[0] ||
      '';

    const country = isoCode ? (countryName(isoCode) || isoCode) : '';
    return json({ country });
  } catch {
    return json({ country: '' });
  }
};

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });

interface MBArtist {
  country?: string;
  area?: {
    name: string;
    'iso-3166-1-codes'?: string[];
  };
}
