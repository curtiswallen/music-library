import type { D1Database } from '@cloudflare/workers-types';
import type { User } from '../types';
import { generateUniqueProfileUrl, slugify } from './utils';

const SESSION_COOKIE = 'session';
const SESSION_TTL    = 60 * 60 * 24 * 30; // 30 days in seconds

// ── Session creation ──────────────────────────────────────────────────────────

export async function createSession(db: D1Database, userId: number): Promise<string> {
  const token     = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL;
  await db.prepare(
    'INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();
  return token;
}

// ── Session cookie helpers ────────────────────────────────────────────────────

export function makeSessionCookie(token: string, prod: boolean): string {
  const attrs = `HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL}${prod ? '; Secure' : ''}`;
  return `${SESSION_COOKIE}=${token}; ${attrs}`;
}

export function clearSessionCookie(prod: boolean): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0${prod ? '; Secure' : ''}`;
}

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === SESSION_COOKIE && v) return v;
  }
  return null;
}

// ── Session validation ────────────────────────────────────────────────────────

export async function validateSession(db: D1Database, token: string): Promise<User | null> {
  const row = await db.prepare(`
    SELECT u.id, u.google_id, u.email, u.username,
           u.display_name, u.profile_url, u.is_private, u.hide_added_at,
           u.timezone, u.avatar_url, u.is_admin, u.created_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
  `).bind(token, Math.floor(Date.now() / 1000)).first<User>();
  return row ?? null;
}

// ── Session deletion ──────────────────────────────────────────────────────────

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM user_sessions WHERE id = ?').bind(token).run();
}

// ── User helpers ──────────────────────────────────────────────────────────────

export async function findOrCreateUser(
  db: D1Database,
  googleId: string,
  email: string,
  username: string,
  avatarUrl: string | null,
  allowedEmails: string
): Promise<User | null> {
  const allowed = allowedEmails.split(',').map(e => e.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(email)) return null;

  const existing = await db.prepare('SELECT * FROM users WHERE google_id = ?')
    .bind(googleId).first<User>();
  if (existing) {
    if (!existing.profile_url) {
      const profileUrl = await generateUniqueProfileUrl(db, username);
      await db.prepare('UPDATE users SET profile_url = ? WHERE id = ?')
        .bind(profileUrl, existing.id).run();
      existing.profile_url = profileUrl;
    }
    return existing;
  }

  const { results: [{ c }] } = await db.prepare('SELECT COUNT(*) as c FROM users')
    .all<{ c: number }>();
  const isAdmin = Number(c) === 0 ? 1 : 0;

  const profileUrl = await generateUniqueProfileUrl(db, username);
  const result = await db.prepare(
    'INSERT INTO users (google_id, email, username, avatar_url, is_admin, profile_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(googleId, email, username, avatarUrl, isAdmin, profileUrl).run();

  return db.prepare('SELECT * FROM users WHERE id = ?')
    .bind(result.meta.last_row_id).first<User>();
}

// ── One-time data migration from albums_v1 ────────────────────────────────────
// Runs automatically on first login. Safe to call again — skips if already done.

export async function autoMigrateLibrary(db: D1Database, userId: number): Promise<void> {
  // Bail if backup table doesn't exist (fresh install, nothing to migrate)
  const hasBak = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='albums_v1'"
  ).first();
  if (!hasBak) return;

  // Skip if this user already has library entries
  const { results: [{ c }] } = await db.prepare(
    'SELECT COUNT(*) as c FROM user_albums WHERE user_id = ?'
  ).bind(userId).all<{ c: number }>();
  if (Number(c) > 0) return;

  const { results: oldAlbums } = await db.prepare('SELECT * FROM albums_v1').all<Record<string, unknown>>();
  if (!oldAlbums.length) return;

  for (const old of oldAlbums) {
    const artist = String(old.artist ?? '');
    const album  = String(old.album  ?? '');
    const id     = Number(old.id);

    // Generate unique JS-quality slug and replace the temporary numeric one
    const baseSlug = `${slugify(artist)}-${slugify(album)}`;
    let   slug     = baseSlug;
    let   n        = 2;
    while (true) {
      const clash = await db.prepare('SELECT id FROM albums WHERE slug = ? AND id != ?')
        .bind(slug, id).first();
      if (!clash) break;
      slug = `${baseSlug}-${n++}`;
    }

    // Split tracks into canonical + per-user annotations
    let rawTracks: Array<Record<string, unknown>> = [];
    try { rawTracks = JSON.parse(String(old.tracks ?? '[]')); } catch {}

    const canonicalTracks = JSON.stringify(rawTracks.map(t => ({
      pos: t.pos, title: t.title, length: t.length ?? null,
    })));
    const tracksData = JSON.stringify(rawTracks.map(t => ({
      pos: t.pos, rating: t.rating ?? null, notable: t.notable ?? false, note: t.note ?? '',
    })));

    await db.prepare('UPDATE albums SET slug = ?, tracks = ? WHERE id = ?')
      .bind(slug, canonicalTracks, id).run();

    await db.prepare(`
      INSERT OR IGNORE INTO user_albums
        (user_id, album_id, genre, subgenres, rating, notes, tracks_data, recommended, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId, id,
      String(old.genre ?? ''),
      String(old.subgenres ?? '[]'),
      old.rating != null ? Number(old.rating) : null,
      String(old.notes ?? ''),
      tracksData,
      Number(old.recommended ?? 0),
      String(old.created_at ?? new Date().toISOString()),
    ).run();
  }
}
