const KV_KEY = 'genre-map-v1';

export interface GenreCacheEntry {
  genreMap: Record<string, string[]>;
  groupedGenres: Array<{ group: string; options: string[] }>;
}

export async function buildGenreCache(db: D1Database): Promise<GenreCacheEntry> {
  const { results } = await db.prepare(`
    SELECT g.name AS genre, g.genre_group, s.name AS sub
    FROM genres g
    LEFT JOIN subgenres s ON s.genre_id = g.id
    ORDER BY g.name ASC, s.name ASC
  `).all<{ genre: string; genre_group: string | null; sub: string | null }>();

  const genreMap: Record<string, string[]> = {};
  const groupedGenres: Array<{ group: string; options: string[] }> = [];
  for (const row of results) {
    if (!genreMap[row.genre]) {
      genreMap[row.genre] = [];
      const g = row.genre_group ?? 'Other';
      let grp = groupedGenres.find(x => x.group === g);
      if (!grp) { grp = { group: g, options: [] }; groupedGenres.push(grp); }
      grp.options.push(row.genre);
    }
    if (row.sub) genreMap[row.genre].push(row.sub);
  }
  groupedGenres.sort((a, b) => a.group.localeCompare(b.group));
  return { genreMap, groupedGenres };
}

export async function getGenreCache(
  kv: KVNamespace, db: D1Database
): Promise<GenreCacheEntry> {
  const cached = await kv.get(KV_KEY, 'json') as GenreCacheEntry | null;
  if (cached) return cached;
  const fresh = await buildGenreCache(db);
  await kv.put(KV_KEY, JSON.stringify(fresh));
  return fresh;
}

export async function invalidateGenreCache(kv: KVNamespace): Promise<void> {
  await kv.delete(KV_KEY);
}
