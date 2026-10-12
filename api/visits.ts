import { Redis } from '@upstash/redis';
import { isTrustedWebsiteRequest, normalizeTag, VISITS_PREFIX } from '../lib/tags';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  if (!isTrustedWebsiteRequest(req)) return Response.json({ error: 'Forbidden' }, { status: 403, headers });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Use a JSON body with a valid tag.' }, { status: 400, headers });
  }
  const tag = normalizeTag(body && typeof body === 'object' && 'tag' in body ? body.tag : null);
  if (!tag) return Response.json({ error: 'Use a tag of up to 64 letters, numbers, hyphens, or underscores.' }, { status: 400, headers });

  try {
    const day = new Date().toISOString().slice(0, 10);
    const pipeline = redis.pipeline();
    pipeline.hincrby(`${VISITS_PREFIX}:tags`, tag, 1);
    pipeline.hincrby(`${VISITS_PREFIX}:day:${day}:tags`, tag, 1);
    await pipeline.exec();
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('Visit analytics error:', error);
    return Response.json({ error: 'Failed to record visit' }, { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
