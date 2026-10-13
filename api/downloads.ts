import { Redis } from '@upstash/redis';
import { clean, requestAnalytics } from '../lib/requestAnalytics';
import { isTrustedWebsiteRequest, normalizeTag, UNTAGGED_KEY } from '../lib/tags';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const COUNTER_KEY = 'sonexis:downloads';
const ANALYTICS_PREFIX = 'sonexis:download-analytics';
const EVENT_KEY = `${ANALYTICS_PREFIX}:events`;
const MAX_STORED_EVENTS = 2000;

async function recordAnalytics(req: Request) {
  let body: { referrer?: unknown; version?: unknown; tag?: unknown } = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') body = parsed;
  } catch {
    // Older clients may send the POST without a JSON body.
  }

  const { fingerprint, details } = await requestAnalytics(req, body.referrer);
  const { country, region, city, continent, timezone, language, device, browser, source: referringSite } = details;
  const timestamp = new Date().toISOString();
  const day = timestamp.slice(0, 10);
  const regionLabel = country === 'Unknown' ? region : `${country} · ${region}`;
  const cityLabel = [city, region, country].filter((part) => part !== 'Unknown').join(', ') || 'Unknown';
  const version = typeof body.version === 'string' ? clean(body.version) : 'Unknown';
  const tag = normalizeTag(body.tag);
  const pipeline = redis.pipeline();
  const dimensions = {
    continents: continent,
    countries: country,
    regions: regionLabel,
    cities: cityLabel,
    timezones: timezone,
    devices: device,
    browsers: browser,
    languages: language,
    sources: referringSite,
    versions: version,
  };
  const event = {
    id: crypto.randomUUID(),
    timestamp,
    visitorId: fingerprint ? fingerprint.slice(0, 12) : null,
    country,
    region,
    city,
    continent,
    timezone,
    device: dimensions.devices,
    browser: dimensions.browsers,
    language,
    source: dimensions.sources,
    version,
    tag,
  };

  pipeline.incr(COUNTER_KEY);
  pipeline.lpush(EVENT_KEY, JSON.stringify(event));
  pipeline.ltrim(EVENT_KEY, 0, MAX_STORED_EVENTS - 1);
  pipeline.hincrby(`${ANALYTICS_PREFIX}:day:${day}:total`, 'downloads', 1);
  pipeline.hincrby(`${ANALYTICS_PREFIX}:days`, day, 1);
  const bucket = tag || UNTAGGED_KEY;
  pipeline.hincrby(`${ANALYTICS_PREFIX}:tags`, bucket, 1);
  pipeline.hincrby(`${ANALYTICS_PREFIX}:day:${day}:tags`, bucket, 1);
  for (const [dimension, value] of Object.entries(dimensions)) {
    pipeline.hincrby(`${ANALYTICS_PREFIX}:${dimension}`, value, 1);
    pipeline.hincrby(`${ANALYTICS_PREFIX}:day:${day}:${dimension}`, value, 1);
  }
  if (fingerprint) {
    pipeline.pfadd(`${ANALYTICS_PREFIX}:unique`, fingerprint);
    pipeline.pfadd(`${ANALYTICS_PREFIX}:day:${day}:unique`, fingerprint);
  }

  const results = await pipeline.exec();
  return Number(results[0]) || 0;
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    if (req.method === 'POST') {
      if (!isTrustedWebsiteRequest(req)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const count = await recordAnalytics(req);
      return Response.json({ count });
    }
    if (req.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const count = (await redis.get<number>(COUNTER_KEY)) || 0;
    return Response.json({ count });
  } catch (error) {
    console.error('Redis error:', error);
    return Response.json(
      { count: 0, error: 'Failed to get count' },
      { status: 500 },
    );
  }
}

export const config = { runtime: 'edge' };
