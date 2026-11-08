import { normalizeTag } from '../lib/tags';
import { rememberedSession, startEngagement } from './engagementTracker';

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
  const privacyOptOut = typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);
  if (privacyOptOut) return Promise.resolve();
  visitRequest = fetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag, referrer: document.referrer, session: true, path: window.location.pathname || '/', ...rememberedSession() }),
    keepalive: true,
  }).then(async (response) => {
    if (!response.ok) return;
    const data = await response.json();
    if (data.sessionId && data.sessionToken) startEngagement({ sessionId: data.sessionId, sessionToken: data.sessionToken });
  }).catch(() => {});
  return visitRequest;
}
