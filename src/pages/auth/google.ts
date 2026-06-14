import type { APIRoute } from 'astro';
import { Google, generateState, generateCodeVerifier } from 'arctic';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async (context) => {
  const next = context.url.searchParams.get('next') ?? '/';

  const google = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${context.url.origin}/auth/callback/google`
  );

  const state        = generateState();
  const codeVerifier = generateCodeVerifier();
  const url          = google.createAuthorizationURL(state, codeVerifier, ['openid', 'profile', 'email']);

  const cookieOpts = `HttpOnly; Path=/; SameSite=Lax; Max-Age=600${import.meta.env.PROD ? '; Secure' : ''}`;
  const headers = new Headers({ Location: url.toString() });
  headers.append('Set-Cookie', `oauth_state=${state}; ${cookieOpts}`);
  headers.append('Set-Cookie', `oauth_cv=${codeVerifier}; ${cookieOpts}`);
  headers.append('Set-Cookie', `oauth_next=${encodeURIComponent(next)}; ${cookieOpts}`);

  return new Response(null, { status: 302, headers });
};
