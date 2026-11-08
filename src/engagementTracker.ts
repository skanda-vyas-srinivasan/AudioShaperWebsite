import type { EngagementEvent } from '../lib/engagement';

const STORAGE_KEY = 'sonexis-engagement-session';
type Credentials = { sessionId: string; sessionToken: string };
let tracker: (() => void) | null = null;
let activateTracker: ((credentials: Credentials) => void) | null = null;

export function rememberedSession(): Credentials | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    return typeof value?.sessionId === 'string' && typeof value?.sessionToken === 'string' ? value : null;
  } catch { return null; }
}

export function startEngagement(credentials?: Credentials) {
  if (tracker) {
    if (credentials) activateTracker?.(credentials);
    return tracker;
  }
  if (!('addEventListener' in window)) return;
  let currentCredentials = credentials || null;
  if (credentials) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials)); } catch { /* Storage is optional. */ }
  }
  const events: EngagementEvent[] = [];
  let lastActivity = Date.now();
  let lastTick = Date.now();
  let activeMs = 0;
  let maxScroll = 0;
  let lastScrollSent = 0;
  let scrollTimer = 0;
  let activityFlushTimer = 0;
  let lastPath = location.pathname;
  let navigatingInternal = false;
  let sending = false;
  const stamp = () => new Date().toISOString();
  const tick = (visible = document.visibilityState === 'visible') => {
    const now = Date.now();
    if (visible) activeMs += Math.min(15000, Math.max(0, Math.min(now, lastActivity + 30000) - lastTick));
    lastTick = now;
  };
  const flush = (beacon = false) => {
    tick();
    if (maxScroll > lastScrollSent) {
      lastScrollSent = maxScroll;
      events.push({ type: 'scroll', timestamp: stamp(), depth: maxScroll });
    }
    if (!currentCredentials || (sending && !beacon) || (!events.length && activeMs < 1000)) return;
    const batch = events.splice(0, 24);
    const duration = Math.min(60000, Math.round(activeMs));
    activeMs -= duration;
    const body = JSON.stringify({ ...currentCredentials, events: batch.length ? batch : [{ type: 'scroll', timestamp: stamp(), depth: maxScroll }], activeMs: duration, automationHint: navigator.webdriver === true });
    if (beacon && navigator.sendBeacon) {
      if (navigator.sendBeacon('/api/engagement', new Blob([body], { type: 'application/json' }))) return;
    }
    sending = true;
    void fetch('/api/engagement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: beacon })
      .catch(() => {})
      .finally(() => { sending = false; if (events.length >= 12) flush(); });
  };
  const scheduleActivityFlush = () => {
    if (activityFlushTimer) return;
    activityFlushTimer = window.setTimeout(() => { activityFlushTimer = 0; flush(); }, 1500);
  };
  activateTracker = (nextCredentials) => {
    currentCredentials = nextCredentials;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextCredentials)); } catch { /* Storage is optional. */ }
    if (events.length || activeMs >= 1000) scheduleActivityFlush();
  };
  const activity = () => { lastActivity = Date.now(); };
  const scroll = () => {
    const height = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const depth = height ? Math.min(100, Math.round((window.scrollY / height) * 100)) : 100;
    if (depth > maxScroll) maxScroll = depth;
    if (maxScroll - lastScrollSent >= 10 || maxScroll === 100 && lastScrollSent < 100) {
      lastScrollSent = maxScroll;
      events.push({ type: 'scroll', timestamp: stamp(), depth: maxScroll });
      if (events.length >= 12) flush(); else scheduleActivityFlush();
    }
  };
  const scheduleScroll = () => {
    activity();
    scheduleActivityFlush();
    if (!scrollTimer) scrollTimer = window.setTimeout(() => { scrollTimer = 0; scroll(); }, 100);
  };
  const click = (event: MouseEvent) => {
    const element = (event.target as Element | null)?.closest?.('a,button,[data-analytics]') as HTMLElement | null;
    if (!element) return;
    activity();
    const explicit = element.dataset.analytics;
    const href = element.getAttribute('href');
    let category = element.tagName === 'BUTTON' ? 'navigation' : 'link';
    let target = explicit || element.id || 'control';
    if (href) {
      try {
        const url = new URL(href, location.href);
        category = url.origin === location.origin ? 'navigation' : /github\.com$/.test(url.hostname) ? 'github' : 'external';
        target = url.origin === location.origin ? url.pathname : url.hostname;
        if (url.origin === location.origin && url.pathname !== location.pathname) navigatingInternal = true;
      } catch { /* Ignore malformed links. */ }
    }
    if (!/^[a-z0-9_:/.-]{1,80}$/i.test(target)) target = 'control';
    events.push({ type: 'click', timestamp: stamp(), category, target });
    if (events.length >= 12) flush(); else scheduleActivityFlush();
  };
  const page = () => {
    const path = location.pathname;
    if (path !== lastPath) { lastPath = path; activity(); events.push({ type: 'page', timestamp: stamp(), path }); flush(); }
  };
  const visibility = () => { if (document.visibilityState === 'hidden') { tick(true); flush(true); } else { tick(false); activity(); } };
  const pagehide = () => {
    if (scrollTimer) { window.clearTimeout(scrollTimer); scrollTimer = 0; scroll(); }
    if (document.visibilityState === 'visible') tick(true);
    if (!navigatingInternal) events.push({ type: 'end', timestamp: stamp() });
    flush(true);
  };
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  history.pushState = function (...args) { originalPush.apply(this, args); page(); };
  history.replaceState = function (...args) { originalReplace.apply(this, args); page(); };
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('pointerdown', activity, { passive: true });
  window.addEventListener('keydown', activity, { passive: true });
  document.addEventListener('click', click, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('popstate', page);
  window.addEventListener('pagehide', pagehide);
  const interval = window.setInterval(() => { tick(); flush(); }, 15000);
  tracker = () => {
    window.clearInterval(interval);
    if (scrollTimer) window.clearTimeout(scrollTimer);
    if (activityFlushTimer) window.clearTimeout(activityFlushTimer);
    window.removeEventListener('scroll', scheduleScroll);
    window.removeEventListener('pointerdown', activity);
    window.removeEventListener('keydown', activity);
    document.removeEventListener('click', click);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('popstate', page);
    window.removeEventListener('pagehide', pagehide);
    history.pushState = originalPush;
    history.replaceState = originalReplace;
    flush(true);
    tracker = null;
    activateTracker = null;
  };
  return tracker;
}
