import { Redis } from '@upstash/redis';
import { readableLocation } from './geo';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const COUNTER_KEY = 'sonexis:downloads';
const ANALYTICS_PREFIX = 'sonexis:download-analytics';
const DIMENSIONS = ['continents', 'countries', 'regions', 'cities', 'timezones', 'devices', 'browsers', 'languages', 'sources', 'versions'] as const;
type Dimension = typeof DIMENSIONS[number];
type Counts = Record<string, number | string> | null;
type CountItem = { label: string; count: number };

const normalizeCounts = (counts: Counts, dimension = '') =>
  Object.entries(counts || {})
    .map(([label, rawCount]) => ({ label: readableLocation(dimension, label), count: Number(rawCount) || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

const mergeCounts = (target: Record<string, number>, source: Counts) => {
  for (const [label, rawCount] of Object.entries(source || {})) {
    target[label] = (target[label] || 0) + (Number(rawCount) || 0);
  }
};

const toDate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateLabel = (date: Date) => date.toISOString().slice(0, 10);

const datesBetween = (from: Date, to: Date) => {
  const dates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to && dates.length <= 366) {
    dates.push(dateLabel(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

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

async function loadFiltered(days: string[]) {
  const aggregate: Record<Dimension, Record<string, number>> = Object.fromEntries(
    DIMENSIONS.map((dimension) => [dimension, {}]),
  ) as Record<Dimension, Record<string, number>>;
  const dailyDownloads: CountItem[] = [];
  const uniqueByDay: CountItem[] = [];

  const rows = await Promise.all(days.map(async (day) => {
    const [total, unique, ...dimensionCounts] = await Promise.all([
      redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:day:${day}:total`),
      redis.pfcount(`${ANALYTICS_PREFIX}:day:${day}:unique`),
      ...DIMENSIONS.map((dimension) => redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:day:${day}:${dimension}`)),
    ]);
    return { day, count: Number(total?.downloads) || 0, unique: Number(unique) || 0, dimensionCounts };
  }));

  for (const { day, count, unique, dimensionCounts } of rows) {
    if (count > 0) dailyDownloads.push({ label: day, count });
    if (unique > 0) uniqueByDay.push({ label: day, count: unique });
    DIMENSIONS.forEach((dimension, index) => mergeCounts(aggregate[dimension], dimensionCounts[index]));
  }

  return {
    filteredTotal: dailyDownloads.reduce((sum, item) => sum + item.count, 0),
    filteredUnique: uniqueByDay.reduce((sum, item) => sum + item.count, 0),
    days: dailyDownloads.sort((a, b) => b.label.localeCompare(a.label)),
    uniqueByDay: uniqueByDay.sort((a, b) => b.label.localeCompare(a.label)),
    dimensions: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, normalizeCounts(aggregate[dimension], dimension)])),
  };
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const secret = process.env.ADMIN_ANALYTICS_TOKEN;
  if (!secret || !(await isAuthorized(req, secret))) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'WWW-Authenticate': 'Bearer' } },
    );
  }

  try {
    const url = new URL(req.url);
    const from = toDate(url.searchParams.get('from'));
    const to = toDate(url.searchParams.get('to'));
    if ((url.searchParams.has('from') && !from) || (url.searchParams.has('to') && !to) || (from && to && from > to)) {
      return Response.json({ error: 'Use valid YYYY-MM-DD dates with from before to.' }, { status: 400 });
    }

    const dayKeys = (await redis.hkeys(`${ANALYTICS_PREFIX}:days`)) || [];
    let result: {
      filteredTotal: number;
      filteredUnique: number;
      days: CountItem[];
      uniqueByDay: CountItem[];
      dimensions: Record<string, CountItem[]>;
      totalDownloads?: number;
    };
    if (from || to) {
      const start = from || to!;
      const end = to || from!;
      const range = datesBetween(start, end);
      if (range.length > 366) return Response.json({ error: 'Date ranges may be at most 366 days.' }, { status: 400 });
      result = await loadFiltered(range);
    } else {
      const [total, uniqueDownloads, days, ...dimensionCounts] = await Promise.all([
        redis.get<number>(COUNTER_KEY),
        redis.pfcount(`${ANALYTICS_PREFIX}:unique`),
        redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:days`),
        ...DIMENSIONS.map((dimension) => redis.hgetall<Record<string, number | string>>(`${ANALYTICS_PREFIX}:${dimension}`)),
      ]);
      const normalizedDays = normalizeCounts(days).sort((a, b) => b.label.localeCompare(a.label));
      const uniqueByDay = dayKeys.length
        ? await Promise.all(dayKeys.map(async (day) => ({ label: day, count: Number(await redis.pfcount(`${ANALYTICS_PREFIX}:day:${day}:unique`)) || 0 })))
        : [];
      result = {
        filteredTotal: normalizedDays.reduce((sum, item) => sum + item.count, 0),
        filteredUnique: Number(uniqueDownloads) || 0,
        days: normalizedDays,
        uniqueByDay: uniqueByDay.filter((item) => item.count > 0).sort((a, b) => b.label.localeCompare(a.label)),
        dimensions: Object.fromEntries(DIMENSIONS.map((dimension, index) => [dimension, normalizeCounts(dimensionCounts[index], dimension)])),
        totalDownloads: Number(total) || 0,
      };
    }

    return Response.json(
      {
        totalDownloads: result.totalDownloads ?? result.filteredTotal,
        filteredTotal: result.filteredTotal,
        uniqueDownloads: result.filteredUnique,
        generatedAt: new Date().toISOString(),
        days: result.days,
        uniqueByDay: result.uniqueByDay,
        ...result.dimensions,
      },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" } },
    );
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: 'Failed to load analytics' }, { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
  }
}

export const config = { runtime: 'edge' };
