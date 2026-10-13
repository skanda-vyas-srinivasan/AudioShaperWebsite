import { continentName, countryName, regionName } from '../api/geo';

export const clean = (value: string | null, fallback = 'Unknown') => {
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

export async function requestAnalytics(req: Request, referrer: unknown) {
  const countryCode = clean(req.headers.get('x-vercel-ip-country'));
  const country = countryName(countryCode);
  const regionCode = clean(req.headers.get('x-vercel-ip-country-region'));
  const region = regionName(countryCode, regionCode);
  const city = clean(req.headers.get('x-vercel-ip-city'));
  const continent = continentName(clean(req.headers.get('x-vercel-ip-continent')));
  const timezone = clean(req.headers.get('x-vercel-ip-timezone'));
  const userAgent = req.headers.get('user-agent') || '';
  const language = clean(req.headers.get('accept-language')?.split(',')[0] || null);
  const fingerprint = await uniqueFingerprint(req);

  return {
    fingerprint,
    details: {
      country, region, city, continent, timezone, language,
      device: classifyDevice(userAgent),
      browser: classifyBrowser(userAgent),
      source: sourceFrom(referrer),
    },
  };
}
