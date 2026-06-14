import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { deleteSession, clearSessionCookie } from '../../lib/auth';

export const POST: APIRoute = async (context) => {
  const sessionId = context.locals.sessionId;
  if (sessionId) {
    await deleteSession(env.DB, sessionId);
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth/login',
      'Set-Cookie': clearSessionCookie(import.meta.env.PROD),
    },
  });
};
