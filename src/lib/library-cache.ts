const kvKey = (userId: number, ownerView: boolean) =>
  `library-overview-v1-${userId}-${ownerView ? 'o' : 'p'}`;

export interface LibraryOverview {
  countries:   string[];
  genres:      string[];
  subMap:      Record<string, string[]>;
  descriptors: string[];
}

export async function getLibraryOverview(
  kv: KVNamespace | undefined,
  db: D1Database,
  userId: number,
  ownerView: boolean,
): Promise<LibraryOverview> {
  if (kv) {
    const cached = await kv.get(kvKey(userId, ownerView), 'json') as LibraryOverview | null;
    if (cached) return cached;
  }

  const hiddenFilter = ownerView ? '' : 'AND ua.is_hidden = 0';
  const { results } = await db.prepare(`
    SELECT a.country, ua.genre, ua.subgenres, ua.descriptors
    FROM user_albums ua
    JOIN albums a ON a.id = ua.album_id
    WHERE ua.user_id = ? ${hiddenFilter} AND (ua.is_queued = 0 OR ua.is_queued IS NULL)
  `).bind(userId).all<{ country: string; genre: string; subgenres: string; descriptors: string }>();

  const countrySet    = new Set<string>();
  const descriptorSet = new Set<string>();
  const genreSet      = new Set<string>();
  const subMap: Record<string, string[]> = {};

  for (const row of results) {
    if (row.country) countrySet.add(row.country);
    if (row.genre) {
      genreSet.add(row.genre);
      if (!subMap[row.genre]) subMap[row.genre] = [];
      try {
        for (const s of JSON.parse(row.subgenres || '[]') as string[]) {
          if (s && !subMap[row.genre].includes(s)) subMap[row.genre].push(s);
        }
      } catch {}
    }
    try {
      for (const d of JSON.parse(row.descriptors || '[]') as string[]) {
        if (d) descriptorSet.add(d);
      }
    } catch {}
  }
  for (const g of Object.keys(subMap)) subMap[g].sort();

  const overview: LibraryOverview = {
    countries:   [...countrySet].sort(),
    genres:      [...genreSet],
    subMap,
    descriptors: [...descriptorSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  };

  if (kv) await kv.put(kvKey(userId, ownerView), JSON.stringify(overview));
  return overview;
}

export async function invalidateLibraryOverview(
  kv: KVNamespace | undefined,
  userId: number,
): Promise<void> {
  if (!kv) return;
  await Promise.all([
    kv.delete(kvKey(userId, true)),
    kv.delete(kvKey(userId, false)),
  ]);
}
