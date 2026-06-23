import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { readSessionToken, validateSession } from './lib/auth';

const AUTH_ROUTES = ['/auth/login', '/auth/google', '/auth/callback/google'];

// Single-segment slugs that look like profile URLs but are protected routes
const RESERVED_SLUGS = new Set(['add', 'settings', 'admin']);

// Valid profile URL slug pattern (without leading slash)
const SLUG_RE = /^([a-z0-9][a-z0-9_-]{1,28}[a-z0-9]|[a-z0-9]{3})$/;

// Public non-profile routes accessible without a session
const PUBLIC_PATHS = new Set(['/']);
const PUBLIC_PREFIXES = ['/artist/', '/album/'];

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return true;
  const segs = path.split('/').filter(Boolean);
  if (!segs.length) return false;
  const slug = segs[0];
  if (!SLUG_RE.test(slug) || RESERVED_SLUGS.has(slug)) return false;
  // /:username  or  /:username/album/:slug  or  /:username/artist/:slug
  return segs.length === 1
    || (segs.length === 3 && (segs[1] === 'album' || segs[1] === 'artist'));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Auth routes are always public
  if (AUTH_ROUTES.some(p => path.startsWith(p))) {
    return next();
  }

  // Always attempt session load so pages get the user if logged in
  const token = readSessionToken(context.request.headers.get('Cookie'));
  if (token) {
    const user = await validateSession(env.DB, token);
    if (user) {
      context.locals.user      = user;
      context.locals.sessionId = token;
      return next();
    }
  }

  context.locals.user      = null;
  context.locals.sessionId = null;

  // Public paths are accessible without a session
  if (isPublicPath(path)) {
    return next();
  }

  // API routes return 401 instead of redirect
  if (path.startsWith('/api/')) {
    return new Response('Unauthorized', { status: 401 });
  }

  return context.redirect(`/auth/login?next=${encodeURIComponent(path)}`);
});
