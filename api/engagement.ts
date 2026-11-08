import { Redis } from '@upstash/redis';
import { isTrustedWebsiteRequest } from '../lib/tags';
import { requestAnalytics } from '../lib/requestAnalytics';
import { sessionKey, SESSION_TTL, Session, validEvent } from '../lib/engagement';

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
const headers = { 'Cache-Control': 'no-store' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  if (!isTrustedWebsiteRequest(req)) return Response.json({ error: 'Forbidden' }, { status: 403, headers });
  try {
    const raw = await req.text();
    if (raw.length > 8192) return Response.json({ error: 'Batch too large' }, { status: 413, headers });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.sessionId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.sessionId)
      || typeof body.sessionToken !== 'string' || !/^[a-f0-9-]{36}$/.test(body.sessionToken)
      || !Array.isArray(body.events) || body.events.length > 24 || body.events.length === 0) {
      return Response.json({ error: 'Invalid batch' }, { status: 400, headers });
    }
    const key = sessionKey(body.sessionId);
    const stored = await redis.get<string | Session>(key);
    if (!stored) return Response.json({ error: 'Session expired' }, { status: 404, headers });
    const session = (typeof stored === 'string' ? JSON.parse(stored) : stored) as Session;
    if (session.token !== body.sessionToken) return Response.json({ error: 'Forbidden' }, { status: 403, headers });
    const { fingerprint } = await requestAnalytics(req, null);
    if (session.visitorId && fingerprint?.slice(0, 12) !== session.visitorId) return Response.json({ error: 'Forbidden' }, { status: 403, headers });
    const now = Date.now();
    if (session.endedAt || session.batches >= 720 || now - Date.parse(session.startedAt) > 4 * 3600000) {
      return Response.json({ error: 'Session closed' }, { status: 409, headers });
    }
    const events = body.events.map((value) => validEvent(value, now));
    if (events.some((event) => !event)) return Response.json({ error: 'Invalid event' }, { status: 400, headers });
    const elapsed = Math.max(0, now - Date.parse(session.lastSeenAt));
    const requestedActive = Number(body.activeMs);
    if (!Number.isInteger(requestedActive) || requestedActive < 0 || requestedActive > 60000) {
      return Response.json({ error: 'Invalid active time' }, { status: 400, headers });
    }
    session.activeMs += Math.min(requestedActive, elapsed + 5000);
    if (session.batches >= 3 && elapsed < 1000) session.requestBurst = true;
    session.batches += 1;
    for (const event of events) {
      if (!event) continue;
      if (event.type === 'scroll') session.maxScroll = Math.max(session.maxScroll, event.depth || 0);
      if (event.type === 'click') session.clicks += 1;
      if (event.type === 'page' && event.path) {
        const previous = session.events.filter((item) => item.type === 'page').at(-1);
        if (previous && Date.parse(event.timestamp) - Date.parse(previous.timestamp) < 1200) session.rapidNavigations += 1;
        if (!session.pages.includes(event.path) && session.pages.length < 30) session.pages.push(event.path);
      }
      if (event.type === 'end') session.endedAt = new Date(now).toISOString();
      session.events.push(event);
    }
    session.events = session.events.slice(-100);
    session.lastSeenAt = new Date(now).toISOString();
    if (body.automationHint === true) session.automationHint = true;
    await redis.set(key, JSON.stringify(session), { ex: SESSION_TTL });
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: 'Invalid JSON' }, { status: 400, headers });
    console.error('Engagement ingestion error:', error);
    return Response.json({ error: 'Failed to record events' }, { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
