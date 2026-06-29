const KV_KEY     = 'community-stats-v1';
const TTL_SECONDS = 3600; // 1 hour

export interface CommunityStats {
  total_albums:      number;
  total_users:       number;
  total_seconds:     number;
  avg_rating:        number | null;
  artist_count:      number;
  country_count:     number;
  recommended_count: number;
  total_ratings:     number;
  public_genres:     string;
}

export const EMPTY_STATS: CommunityStats = {
  total_albums: 0, total_users: 0, total_seconds: 0, avg_rating: null,
  artist_count: 0, country_count: 0, recommended_count: 0, total_ratings: 0,
  public_genres: '[]',
};

async function buildStats(db: D1Database): Promise<CommunityStats> {
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM albums) as total_albums,
      (SELECT COUNT(*) FROM users WHERE is_private = 0) as total_users,
      (SELECT COALESCE(SUM(total_seconds), 0) FROM users WHERE is_private = 0) as total_seconds,
      (SELECT ROUND(AVG(rating), 1) FROM user_albums WHERE rating IS NOT NULL AND is_hidden = 0) as avg_rating,
      (SELECT COUNT(DISTINCT artist) FROM albums) as artist_count,
      (SELECT COUNT(DISTINCT country) FROM albums WHERE country IS NOT NULL AND country != '') as country_count,
      (SELECT COUNT(*) FROM user_albums WHERE recommended = 1 AND is_hidden = 0) as recommended_count,
      (SELECT COUNT(*) FROM user_albums WHERE rating IS NOT NULL AND is_hidden = 0) as total_ratings,
      (SELECT json_group_array(DISTINCT key)
       FROM albums, json_each(genre_counts)
       WHERE genre_counts != '{}') as public_genres
  `).first<CommunityStats>();
  return result ?? EMPTY_STATS;
}

export async function getCommunityStats(
  kv: KVNamespace | undefined,
  db: D1Database,
): Promise<CommunityStats> {
  if (!kv) return buildStats(db);
  const cached = await kv.get(KV_KEY, 'json') as CommunityStats | null;
  if (cached) return cached;
  const fresh = await buildStats(db);
  await kv.put(KV_KEY, JSON.stringify(fresh), { expirationTtl: TTL_SECONDS });
  return fresh;
}

const KV_COUNTRIES_KEY = 'community-countries-v1';

async function buildCountries(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(`
    SELECT DISTINCT a.country
    FROM albums a
    JOIN user_albums ua ON ua.album_id = a.id
    JOIN users u ON u.id = ua.user_id AND u.is_private = 0
    WHERE a.country IS NOT NULL AND a.country != '' AND ua.is_hidden = 0 AND ua.rating IS NOT NULL
    ORDER BY a.country
  `).all<{ country: string }>();
  return results.map(r => r.country);
}

export async function getCommunityCountries(
  kv: KVNamespace | undefined,
  db: D1Database,
): Promise<string[]> {
  if (!kv) return buildCountries(db);
  const cached = await kv.get(KV_COUNTRIES_KEY, 'json') as string[] | null;
  if (cached) return cached;
  const fresh = await buildCountries(db);
  await kv.put(KV_COUNTRIES_KEY, JSON.stringify(fresh), { expirationTtl: TTL_SECONDS });
  return fresh;
}
