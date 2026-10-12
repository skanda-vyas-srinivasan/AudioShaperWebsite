import { normalizeTag } from '../lib/tags';

const STORAGE_KEY = 'sonexis-ref-tag';
let activeTag: string | null = null;
let initialized = false;
let visitRequest: Promise<void> | null = null;

export function getDownloadTag(): string | null {
  if (initialized) return activeTag;
  initialized = true;
  activeTag = normalizeTag(new URLSearchParams(window.location.search).get('ref'));
  try {
    if (activeTag) sessionStorage.setItem(STORAGE_KEY, activeTag);
    else activeTag = normalizeTag(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    // Tracking must not prevent downloads when browser storage is disabled.
  }
  return activeTag;
}

export function recordWebsiteVisit(): Promise<void> {
  // Count each page load, but only once when React remounts in Strict Mode.
  if (visitRequest) return visitRequest;
  const tag = getDownloadTag();
  visitRequest = fetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
    keepalive: true,
  }).then(() => {}).catch(() => {});
  return visitRequest;
}
