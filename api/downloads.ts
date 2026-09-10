import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const COUNTER_KEY = 'sonexis:downloads';
const ANALYTICS_PREFIX = 'sonexis:download-analytics';

const clean = (value: string | null, fallback = 'Unknown') => {
  if (!value) return fallback;
  try {
    return decodeURIComponent(value).trim().slice(0, 100) || fallback;
  } catch {
    return value.trim().slice(0, 100) || fallback;
  }
};

const classifyBrowser = (userAgent: string) => {
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  return 'Other';
};

const classifyDevice = (userAgent: string) => {
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Other';
};

const sourceFrom = (value: unknown) => {
  if (typeof value !== 'string' || !value) return 'Direct / unknown';
  try {
    return new URL(value).hostname.replace(/^www\./, '').slice(0, 100) || 'Direct / unknown';
  } catch {
    return 'Direct / unknown';
  }
};

const isTrustedWebsiteRequest = (req: Request) => {
  const source = req.headers.get('origin') || req.headers.get('referer');
  if (!source) return false;

  try {
    const hostname = new URL(source).hostname;
    return hostname === 'sonexis.ink'
      || hostname === 'www.sonexis.ink'
      || hostname === 'localhost'
      || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

async function uniqueFingerprint(req: Request) {
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret) return null;

  const ip = req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '';
  if (!ip) return null;

  const input = `${ip}\n${req.headers.get('user-agent') || ''}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(input));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function recordAnalytics(req: Request) {
  const country = clean(req.headers.get('x-vercel-ip-country'));
  const regionCode = clean(req.headers.get('x-vercel-ip-country-region'));
  const city = clean(req.headers.get('x-vercel-ip-city'));
  const continent = clean(req.headers.get('x-vercel-ip-continent'));
  const timezone = clean(req.headers.get('x-vercel-ip-timezone'));
  const userAgent = req.headers.get('user-agent') || '';
  const language = clean(req.headers.get('accept-language')?.split(',')[0] || null);
  const day = new Date().toISOString().slice(0, 10);
  const fingerprint = await uniqueFingerprint(req);

  let body: { referrer?: unknown; version?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Older clients may send the POST without a JSON body.
  }

  const region = country === 'Unknown' ? regionCode : `${country} · ${regionCode}`;
  const cityLabel = [city, regionCode, country].filter((part) => part !== 'Unknown').join(', ') || 'Unknown';
  const version = typeof body.version === 'string' ? clean(body.version) : 'Unknown';
  const pipeline = redis.pipeline();
  const dimensions = {
    continents: continent,
    countries: country,
    regions: region,
    cities: cityLabel,
    timezones: timezone,
    devices: classifyDevice(userAgent),
    browsers: classifyBrowser(userAgent),
    languages: language,
    sources: sourceFrom(body.referrer),
    versions: version,
  };

  pipeline.incr(COUNTER_KEY);
  pipeline.hincrby(`${ANALYTICS_PREFIX}:day:${day}:total`, 'downloads', 1);
  pipeline.hincrby(`${ANALYTICS_PREFIX}:days`, day, 1);
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
