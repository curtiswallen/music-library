const KV_KEY = 'descriptors:canonical:v1';

export async function buildDescriptorCache(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare(
    `SELECT name FROM descriptors WHERE is_canonical = 1 ORDER BY name ASC`
  ).all<{ name: string }>();
  return results.map(r => r.name);
}

export async function getDescriptorCache(
  kv: KVNamespace | undefined, db: D1Database
): Promise<string[]> {
  if (!kv) return buildDescriptorCache(db);
  const cached = await kv.get(KV_KEY, 'json') as string[] | null;
  if (cached) return cached;
  const fresh = await buildDescriptorCache(db);
  await kv.put(KV_KEY, JSON.stringify(fresh));
  return fresh;
}

export async function invalidateDescriptorCache(kv: KVNamespace | undefined): Promise<void> {
  if (kv) await kv.delete(KV_KEY);
}
