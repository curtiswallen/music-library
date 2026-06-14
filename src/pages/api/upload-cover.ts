import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const formData = await context.request.formData();
  const file = formData.get('file') as File | null;

  if (!file || !file.type.startsWith('image/')) {
    return Response.json({ error: 'Invalid file' }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return Response.json({ error: 'File too large' }, { status: 400 });
  }

  const key = `covers/${context.locals.user.id}/${Date.now()}.jpg`;

  await env.COVERS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  const base = (env.COVERS_PUBLIC_URL ?? '').replace(/\/$/, '');
  return Response.json({ url: `${base}/${key}` });
};
