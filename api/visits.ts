import { Redis } from '@upstash/redis';
import { isTrustedWebsiteRequest, normalizeTag, UNTAGGED_KEY, VISITS_PREFIX } from '../lib/tags';
import { requestAnalytics } from '../lib/requestAnalytics';
import { classifyUserAgent, sessionKey, SESSION_TTL, Session, validPath } from '../lib/engagement';
import { networkForRequest } from '../lib/network';

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
    const raw = await req.text();
    if (raw.length > 2048) return Response.json({ error: 'Visit payload too large' }, { status: 413, headers });
    body = JSON.parse(raw);
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
    if (fingerprint) {
      const minute = Math.floor(Date.now() / 60000);
      const rateKey = `${VISITS_PREFIX}:rate:${minute}:${fingerprint.slice(0, 24)}`;
      const count = await redis.incr(rateKey);
      if (count === 1) await redis.expire(rateKey, 90);
      if (count > 60) return Response.json({ error: 'Rate limited' }, { status: 429, headers });
    }
    const wantsSession = 'session' in body && body.session === true;
    let previous: Session | null = null;
    if (wantsSession && 'sessionId' in body && 'sessionToken' in body && typeof body.sessionId === 'string' && typeof body.sessionToken === 'string') {
      const raw = await redis.get<string | Session>(sessionKey(body.sessionId));
      const candidate = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as Session : null;
      if (candidate && candidate.token === body.sessionToken && !candidate.endedAt
        && Date.now() - Date.parse(candidate.lastSeenAt) < 1800000
        && candidate.visitorId === (fingerprint ? fingerprint.slice(0, 12) : null)) previous = candidate;
    }
    const network = wantsSession ? previous?.network || await networkForRequest(req) : null;
    const timestamp = new Date().toISOString();
    const day = timestamp.slice(0, 10);
    const visitId = crypto.randomUUID();
    const sessionId = wantsSession ? previous?.id || crypto.randomUUID() : null;
    const sessionToken = wantsSession ? previous?.token || crypto.randomUUID() : null;
    const userAgentKind = classifyUserAgent(req.headers.get('user-agent') || '');
    const event = {
      id: visitId,
      timestamp,
      visitorId: fingerprint ? fingerprint.slice(0, 12) : null,
      tag,
      ...details,
      ...(wantsSession ? { sessionId, network, userAgentKind, uaClassifierVersion: 2 } : {}),
    };
    if (sessionId && sessionToken && network) {
      const path = validPath('path' in body ? body.path : null) || '/';
      const session: Session = previous || {
        id: sessionId, token: sessionToken, visitId, visitorId: event.visitorId,
        startedAt: timestamp, lastSeenAt: timestamp, endedAt: null, activeMs: 0,
        maxScroll: 0, clicks: 0, pages: [path],
        events: [{ type: 'page', timestamp, path }], batches: 0, network, userAgentKind,
        automationHint: false, rapidNavigations: 0, requestBurst: false, uaClassifierVersion: 2,
      };
      if (previous) {
        session.lastSeenAt = timestamp;
        if (!session.pages.includes(path) && session.pages.length < 30) session.pages.push(path);
        session.events.push({ type: 'page', timestamp, path });
        session.events = session.events.slice(-100);
      }
      await redis.set(sessionKey(sessionId), JSON.stringify(session), { ex: SESSION_TTL });
    }
    const pipeline = redis.pipeline();
    pipeline.hincrby(`${VISITS_PREFIX}:tags`, bucket, 1);
    pipeline.hincrby(`${VISITS_PREFIX}:day:${day}:tags`, bucket, 1);
    pipeline.lpush(`${VISITS_PREFIX}:events`, JSON.stringify(event));
    pipeline.ltrim(`${VISITS_PREFIX}:events`, 0, 1999);
    await pipeline.exec();
    return Response.json({ ok: true, ...(sessionId ? { sessionId, sessionToken, visitorId: event.visitorId } : {}) }, { headers });
  } catch (error) {
    console.error('Visit analytics error:', error);
    return Response.json({ error: 'Failed to record visit' }, { status: 500, headers });
  }
}

export const config = { runtime: 'edge' };
