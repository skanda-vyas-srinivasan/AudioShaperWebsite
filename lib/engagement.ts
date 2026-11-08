export type EngagementEvent = { type: 'page' | 'scroll' | 'click' | 'end'; timestamp: string; path?: string; category?: string; target?: string; depth?: number };
export type Network = { asn: string | null; organization: string | null; provider: string | null; kind: 'hosting' | 'residential' | 'corporate' | 'unknown'; cloud: string | null; vpnProxy: 'unknown' };
export type Session = {
  id: string; token: string; visitId: string; visitorId: string | null; startedAt: string; lastSeenAt: string;
  endedAt: string | null; activeMs: number; maxScroll: number; clicks: number; pages: string[];
  events: EngagementEvent[]; batches: number; network: Network; userAgentKind: 'bot' | 'scanner' | 'automation' | 'browser' | 'unknown';
  automationHint: boolean; rapidNavigations: number; requestBurst: boolean; uaClassifierVersion?: number;
};

export const SESSION_TTL = 7 * 86400;
export const sessionKey = (id: string) => `sonexis:visit-analytics:session:${id}`;
const safeText = (value: unknown, max = 100) => typeof value === 'string' ? value.slice(0, max) : null;

export function classifyUserAgent(ua: string): Session['userAgentKind'] {
  if (/proofpoint|mimecast|barracuda|safelinks|urlscan|zscaler|netskope|symantec|defender.*(scan|link)/i.test(ua)) return 'scanner';
  if (/headlesschrome|phantomjs|selenium|playwright|puppeteer/i.test(ua)) return 'automation';
  if (/bot\b|crawler|spider|curl\/|wget\/|python-requests|go-http-client|httpclient/i.test(ua)) return 'bot';
  if (/mozilla\/5\.0/i.test(ua)) return 'browser';
  return 'unknown';
}

export function classifyNetwork(asn: unknown, organization: unknown): Network {
  const org = safeText(organization) || null;
  const number = typeof asn === 'string' && /^AS\d{1,10}$/.test(asn) ? asn : null;
  const cloud = org && (/amazon|aws/i.test(org) ? 'AWS' : /microsoft|azure/i.test(org) ? 'Azure' : /google cloud/i.test(org) ? 'Google Cloud' : null);
  const hosting = Boolean(cloud || (org && /digitalocean|linode|akamai|hetzner|ovh|vultr|cloudflare|leaseweb|contabo|hosting|datacenter|data center/i.test(org)));
  // An ASN name alone cannot reliably separate household and enterprise access.
  return { asn: number, organization: org, provider: org, kind: hosting ? 'hosting' : 'unknown', cloud: cloud || null, vpnProxy: 'unknown' };
}

export function classifySession(session: Session | null, legacy: { userAgentKind?: string; network?: Network; rapidRepeat?: boolean; uaClassifierVersion?: number } = {}) {
  const ua = session?.userAgentKind || legacy.userAgentKind;
  const uaVersion = session?.uaClassifierVersion || legacy.uaClassifierVersion;
  const network = session?.network || legacy.network;
  const signals: { level: 'signature' | 'weak' | 'engagement'; description: string }[] = [];
  let risk = 0;
  if (ua === 'scanner') { risk += 5; signals.push({ level: 'signature', description: 'Security scanner user-agent signature (unverified)' }); }
  else if (ua === 'bot' && uaVersion === 2) { risk += 5; signals.push({ level: 'signature', description: 'Bot or script-client user-agent signature (unverified)' }); }
  else if (ua === 'bot') { risk += 2; signals.push({ level: 'weak', description: 'Legacy bot category also included browser automation; original user agent was not retained' }); }
  else if (ua === 'automation') { risk += 2; signals.push({ level: 'weak', description: 'Browser automation user-agent marker; a person may still be driving this browser' }); }
  if (session?.automationHint && ua !== 'automation' && !(ua === 'bot' && uaVersion !== 2)) { risk += 2; signals.push({ level: 'weak', description: 'Browser reported an automation indicator' }); }
  if (network?.kind === 'hosting') { risk += 1; signals.push({ level: 'weak', description: `Hosting or cloud ASN${network.cloud ? ` (${network.cloud})` : ''}` }); }
  if (session?.requestBurst) { risk += 2; signals.push({ level: 'weak', description: 'Repeated rapid event batches' }); }
  if (!session && legacy.rapidRepeat) { risk += 2; signals.push({ level: 'weak', description: 'Several recorded visits share this shortened visitor ID within 20 seconds; could be refreshes or automation' }); }
  if (session && session.rapidNavigations >= 2) { risk += 2; signals.push({ level: 'weak', description: 'Several pages navigated in rapid succession' }); }
  if (session && session.endedAt && Date.parse(session.endedAt) - Date.parse(session.startedAt) < 3000 && session.pages.length <= 1 && session.clicks === 0) {
    risk += 1; signals.push({ level: 'weak', description: 'Very short observed session' });
  }
  const engaged = Boolean(session && session.batches > 0 && (session.activeMs >= 15000 || session.clicks > 0 || session.maxScroll >= 50 || session.pages.length >= 2));
  if (engaged) signals.push({ level: 'engagement', description: 'Observable engagement; client reported and not proof of a human' });
  const classification = risk >= 4 ? 'Likely automated' : risk <= 1 && engaged ? 'Likely human' : 'Uncertain';
  return {
    classification, score: risk, signals,
    evidenceBasis: session ? session.batches > 0 ? 'session' : 'request-only' : 'metadata-only',
    limitation: session ? session.batches > 0 ? 'Client events can be simulated or blocked.' : 'No engagement batch has been received for this session.' : 'Metadata only: historical engagement was not recorded. Matching visitor IDs and nearby timestamps do not establish a session or identify a person.',
  };
}

export function validPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 160 || !/^\/(?:$|(?:releases|privacy)\.html$|projects?\/[a-z0-9-]{1,80}\/?$)/i.test(value)) return null;
  return value;
}

export function validEvent(value: unknown, now: number): EngagementEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (!['page', 'scroll', 'click', 'end'].includes(String(event.type))) return null;
  const time = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
  if (!Number.isFinite(time) || Math.abs(now - time) > 300000) return null;
  const type = event.type as EngagementEvent['type'];
  if (type === 'page') { const path = validPath(event.path); return path ? { type, timestamp: new Date(time).toISOString(), path } : null; }
  if (type === 'scroll') { const depth = Number(event.depth); return Number.isInteger(depth) && depth >= 0 && depth <= 100 ? { type, timestamp: new Date(time).toISOString(), depth } : null; }
  if (type === 'click') {
    const category = safeText(event.category, 40);
    const target = safeText(event.target, 80);
    return category && /^[a-z0-9_-]+$/.test(category) && target && /^[a-z0-9_:/.-]+$/i.test(target) ? { type, timestamp: new Date(time).toISOString(), category, target } : null;
  }
  return { type, timestamp: new Date(time).toISOString() };
}
