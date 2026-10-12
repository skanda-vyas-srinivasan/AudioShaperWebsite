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

export function recordTaggedVisit(): Promise<void> {
  // Count each tagged page load, but only once when React remounts in Strict Mode.
  if (visitRequest) return visitRequest;
  getDownloadTag();
  const tag = normalizeTag(new URLSearchParams(window.location.search).get('ref'));
  if (!tag) return Promise.resolve();
  visitRequest = fetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
    keepalive: true,
  }).then(() => {}).catch(() => {});
  return visitRequest;
}
