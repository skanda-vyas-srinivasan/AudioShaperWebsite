// Use short campaign labels, never names, email addresses, or other personal data.
export function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(tag) ? tag : null;
}

export const VISITS_PREFIX = 'sonexis:visit-analytics';

export function isTrustedWebsiteRequest(req: Request): boolean {
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
}
