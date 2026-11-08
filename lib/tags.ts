// Use short campaign labels, never names, email addresses, or other personal data.
export function normalizeTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const tag = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(tag) ? tag : null;
}

export const VISITS_PREFIX = 'sonexis:visit-analytics';
// Parentheses cannot occur in a valid campaign tag, so this bucket cannot collide.
export const UNTAGGED_KEY = '(untagged)';

export function isTrustedWebsiteRequest(req: Request): boolean {
  const source = req.headers.get('origin') || req.headers.get('referer');
  if (!source) return false;
  try {
    const hostname = new URL(source).hostname;
    const requestOrigin = new URL(req.url).origin;
    return new URL(source).origin === requestOrigin || hostname === 'sonexis.ink'
      || hostname === 'www.sonexis.ink'
      || hostname === 'localhost'
      || /^sonexis-[a-z0-9-]+\.vercel\.app$/.test(hostname);
  } catch {
    return false;
  }
}
