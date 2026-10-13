import { Redis } from '@upstash/redis';
import { isTrustedWebsiteRequest, normalizeTag, UNTAGGED_KEY, VISITS_PREFIX } from '../lib/tags';
import { requestAnalytics } from '../lib/requestAnalytics';

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
    return Response.json({ error: 'Use a JSON object with an optional tag.' }, { status: 400, headers });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Use a JSON object with an optional tag.' }, { status: 400, headers });
  }
  const suppliedTag = 'tag' in body ? body.tag : null;
  const tag = normalizeTag(suppliedTag);
  if (suppliedTag != null && !tag) return Response.json({ error: 'Use a tag of up to 64 letters, numbers, hyphens, or underscores.' }, { status: 400, headers });
  const bucket = tag || UNTAGGED_KEY;

  try {
    const referrer = 'referrer' in body ? body.referrer : null;
    const { fingerprint, details } = await requestAnalytics(req, referrer);
    const timestamp = new Date().toISOString();
    const day = timestamp.slice(0, 10);
    const event = {
      id: crypto.randomUUID(),
      timestamp,
      visitorId: fingerprint ? fingerprint.slice(0, 12) : null,
      tag,
      ...details,
    };
    const pipeline = redis.pipeline();
    pipeline.hincrby(`${VISITS_PREFIX}:tags`, bucket, 1);
    pipeline.hincrby(`${VISITS_PREFIX}:day:${day}:tags`, bucket, 1);
    pipeline.lpush(`${VISITS_PREFIX}:events`, JSON.stringify(event));
    pipeline.ltrim(`${VISITS_PREFIX}:events`, 0, 1999);
    await pipeline.exec();
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error('Visit analytics error:', error);
    return Response.json({ error: 'Failed to record visit' }, { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
