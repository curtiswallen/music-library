import type { APIRoute } from 'astro';
import { Google } from 'arctic';
import { env } from 'cloudflare:workers';
import {
  findOrCreateUser,
  createSession,
  makeSessionCookie,
  autoMigrateLibrary,
} from '../../../lib/auth';

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(c => {
      const i = c.indexOf('=');
      return [c.slice(0, i).trim(), c.slice(i + 1).trim()];
    })
  );
}

export const GET: APIRoute = async (context) => {
  const params      = context.url.searchParams;
  const code        = params.get('code');
  const state       = params.get('state');
  const cookies     = parseCookies(context.request.headers.get('Cookie') ?? '');
  const storedState = cookies['oauth_state'];
  const codeVerifier = cookies['oauth_cv'];
  const nextRaw     = cookies['oauth_next'];
  const next        = nextRaw ? decodeURIComponent(nextRaw) : '/';

  if (!code || !state || state !== storedState || !codeVerifier) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  try {
    const google = new Google(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `${context.url.origin}/auth/callback/google`
    );

    const tokens      = await google.validateAuthorizationCode(code, codeVerifier);
    const accessToken = tokens.accessToken();

    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()) as { sub: string; email: string; name: string; picture?: string };

    const user = await findOrCreateUser(
      env.DB,
      info.sub,
      info.email,
      info.name,
      info.picture ?? null,
      env.ALLOWED_EMAILS ?? ''
    );

    if (!user) {
      return new Response('Access denied — your email is not on the allow-list.', { status: 403 });
    }

    // On the very first login, adopt any existing albums_v1 data into user_albums
    await autoMigrateLibrary(env.DB, user.id);

    const token  = await createSession(env.DB, user.id);
    const cookie = makeSessionCookie(token, import.meta.env.PROD);

    const clearOpts = `HttpOnly; Path=/; Max-Age=0${import.meta.env.PROD ? '; Secure' : ''}`;
    const headers   = new Headers({ Location: next });
    headers.append('Set-Cookie', cookie);
    headers.append('Set-Cookie', `oauth_state=; ${clearOpts}`);
    headers.append('Set-Cookie', `oauth_cv=; ${clearOpts}`);
    headers.append('Set-Cookie', `oauth_next=; ${clearOpts}`);

    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new Response('Authentication failed', { status: 500 });
  }
};
