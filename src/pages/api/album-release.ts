import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url }) => {
  const albumId = url.searchParams.get('albumId');
  const mbid    = url.searchParams.get('mbid');
  if (!albumId || !mbid) return new Response('Bad request', { status: 400 });

  const db = env.DB;

  const [loggedByRes, statsRes, releaseRes] = await Promise.all([
    db.prepare(`
      SELECT u.display_name, u.profile_url, u.avatar_url,
             ua.rating, ua.added_at, ua.notes
      FROM user_albums ua
      JOIN users u ON u.id = ua.user_id AND u.is_private = 0
      WHERE ua.album_id = ? AND ua.release_mbid = ?
        AND ua.is_hidden = 0 AND (ua.is_queued = 0 OR ua.is_queued IS NULL)
      ORDER BY ua.added_at DESC
      LIMIT 10
    `).bind(albumId, mbid).all<{
      display_name: string | null; profile_url: string; avatar_url: string | null;
      rating: number | null; added_at: string | null; notes: string | null;
    }>(),

    db.prepare(`
      SELECT ROUND(AVG(ua.rating), 1) as avg_rating, COUNT(*) as rating_count
      FROM user_albums ua
      JOIN users u ON u.id = ua.user_id AND u.is_private = 0
      WHERE ua.album_id = ? AND ua.release_mbid = ?
        AND ua.is_hidden = 0 AND (ua.is_queued = 0 OR ua.is_queued IS NULL)
        AND ua.rating IS NOT NULL
    `).bind(albumId, mbid).first<{ avg_rating: number | null; rating_count: number }>(),

    db.prepare(`
      SELECT ua.release_title, ua.release_data
      FROM user_albums ua
      WHERE ua.album_id = ? AND ua.release_mbid = ?
        AND ua.release_data IS NOT NULL
      LIMIT 1
    `).bind(albumId, mbid).first<{ release_title: string | null; release_data: string | null }>(),
  ]);

  let releaseInfo: unknown = null;
  if (releaseRes?.release_data) {
    try { releaseInfo = JSON.parse(releaseRes.release_data); } catch {}
  }

  return new Response(JSON.stringify({
    loggedBy:     loggedByRes.results,
    avgRating:    statsRes?.avg_rating ?? null,
    ratingCount:  statsRes?.rating_count ?? 0,
    releaseInfo,
    releaseTitle: releaseRes?.release_title ?? null,
  }), { headers: { 'Content-Type': 'application/json' } });
};
