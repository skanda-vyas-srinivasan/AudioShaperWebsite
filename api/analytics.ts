import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const COUNTER_KEY = 'sonexis:downloads';
const ANALYTICS_PREFIX = 'sonexis:download-analytics';
type Counts = Record<string, number | string> | null;

const normalizeCounts = (counts: Counts) =>
  Object.entries(counts || {})
    .map(([label, rawCount]) => ({ label, count: Number(rawCount) || 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

async function isAuthorized(req: Request, secret: string) {
  const authorization = req.headers.get('authorization') || '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supplied) return false;

  const encoder = new TextEncoder();
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
  ]);
  const expectedBytes = new Uint8Array(expectedHash);
  const suppliedBytes = new Uint8Array(suppliedHash);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ suppliedBytes[index];
  }
  return difference === 0;
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const secret = process.env.ADMIN_ANALYTICS_TOKEN;
  if (!secret || !(await isAuthorized(req, secret))) {
    return Response.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'WWW-Authenticate': 'Bearer',
        },
      },
    );
  }

  try {
    const dayKeys = (await redis.hkeys(`${ANALYTICS_PREFIX}:days`)) || [];
    const uniqueDayKeys = dayKeys.map((day) => `${ANALYTICS_PREFIX}:unique:${day}`);
    const [total, uniqueDownloads, days, continents, countries, regions, cities, timezones, devices, browsers, languages, sources, versions] =
      await Promise.all([
        redis.get<number>(COUNTER_KEY),
        redis.pfcount(`${ANALYTICS_PREFIX}:unique`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:days`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:continents`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:countries`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:regions`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:cities`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:timezones`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:devices`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:browsers`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:languages`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:sources`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:versions`),
      ]);

    const dailyUniqueCounts = uniqueDayKeys.length
      ? await Promise.all(uniqueDayKeys.map((key) => redis.pfcount(key)))
      : [];
    const uniqueByDay = dayKeys
      .map((label, index) => ({ label, count: Number(dailyUniqueCounts[index]) || 0 }))
      .sort((a, b) => b.label.localeCompare(a.label));
    const normalizedDays = normalizeCounts(days).sort((a, b) => b.label.localeCompare(a.label));
    const trackedDownloads = normalizedDays.reduce((sum, item) => sum + item.count, 0);

    return Response.json(
      {
        totalDownloads: Number(total) || 0,
        trackedDownloads,
        uniqueDownloads: Number(uniqueDownloads) || 0,
        generatedAt: new Date().toISOString(),
        days: normalizedDays,
        uniqueByDay,
        continents: normalizeCounts(continents),
        countries: normalizeCounts(countries),
        regions: normalizeCounts(regions),
        cities: normalizeCounts(cities),
        timezones: normalizeCounts(timezones),
        devices: normalizeCounts(devices),
        browsers: normalizeCounts(browsers),
        languages: normalizeCounts(languages),
        sources: normalizeCounts(sources),
        versions: normalizeCounts(versions),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        },
      },
    );
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json(
      { error: 'Failed to load analytics' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }
}

export const config = { runtime: 'edge' };
