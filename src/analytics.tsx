import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BarChart3, Download, FileDown, Lock, LogOut, MapPin, RefreshCw, Search, Users } from 'lucide-react';
import './index.css';

type CountItem = { label: string; count: number };
type Analytics = {
  totalDownloads: number;
  filteredTotal: number;
  uniqueDownloads: number;
  generatedAt: string;
  days: CountItem[];
  uniqueByDay: CountItem[];
  countries: CountItem[];
  regions: CountItem[];
  cities: CountItem[];
  continents: CountItem[];
  timezones: CountItem[];
  devices: CountItem[];
  browsers: CountItem[];
  languages: CountItem[];
  sources: CountItem[];
  versions: CountItem[];
};

const SESSION_KEY = 'sonexis-analytics-token';
const dimensionLabels = { countries: 'Countries', regions: 'Regions', cities: 'Cities' } as const;
type LocationDimension = keyof typeof dimensionLabels;

const utcDate = (date = new Date()) => date.toISOString().slice(0, 10);
const subtractDays = (count: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - count);
  return utcDate(date);
};

function Metric({ icon, value, label, color, detail }: { icon: React.ReactNode; value: number; label: string; color: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5">
      <div className={`mb-4 flex items-center gap-2 [&>svg]:h-5 [&>svg]:w-5 ${color}`}>{icon}</div>
      <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-[#C5C8D8]">{label}</div>
      {detail && <div className="mt-2 text-xs text-[#747789]">{detail}</div>}
    </div>
  );
}

function TrendChart({ downloads, unique }: { downloads: CountItem[]; unique: CountItem[] }) {
  const ordered = [...downloads].sort((a, b) => a.label.localeCompare(b.label)).slice(-31);
  const uniqueMap = new Map(unique.map((item) => [item.label, item.count]));
  const maximum = Math.max(...ordered.map((item) => item.count), 1);
  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Download activity</h2>
          <p className="mt-1 text-sm text-[#747789]">Daily clicks with unique downloader estimates</p>
        </div>
        <div className="flex gap-4 text-xs text-[#C5C8D8]">
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#20F4FF]" />Downloads</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#FF2D95]" />Unique</span>
        </div>
      </div>
      {ordered.length === 0 ? <p className="py-12 text-center text-sm text-[#747789]">No downloads in this date range.</p> : (
        <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-7 pt-5">
          {ordered.map((item) => {
            const uniqueCount = uniqueMap.get(item.label) || 0;
            return (
              <div key={item.label} className="group flex h-full min-w-[22px] flex-1 flex-col items-center justify-end gap-1">
                <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                  <div className="w-2.5 rounded-t bg-[#20F4FF]/80 transition-all group-hover:bg-[#20F4FF]" style={{ height: `${Math.max((item.count / maximum) * 100, 3)}%` }} title={`${item.label}: ${item.count} downloads`} />
                  <div className="w-2.5 rounded-t bg-[#FF2D95]/80 transition-all group-hover:bg-[#FF2D95]" style={{ height: `${Math.max((uniqueCount / maximum) * 100, 3)}%` }} title={`${item.label}: ${uniqueCount} unique`} />
                </div>
                <span className="text-[10px] text-[#747789]">{item.label.slice(5)}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LocationTable({ dimension, items, onSelect }: { dimension: LocationDimension; items: CountItem[]; onSelect: (label: string) => void }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'count' | 'name'>('count');
  const filtered = useMemo(() => items
    .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === 'count' ? b.count - a.count : a.label.localeCompare(b.label)), [items, query, sort]);
  const maximum = Math.max(...items.map((item) => item.count), 1);

  const exportCsv = () => {
    const rows = [['Location', 'Downloads'], ...filtered.map((item) => [item.label, String(item.count)])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sonexis-${dimension}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{dimensionLabels[dimension]}</h2>
          <p className="mt-1 text-sm text-[#747789]">Click a row to focus on a location.</p>
        </div>
        <button type="button" onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-[#343449] px-3 py-2 text-xs font-medium text-[#C5C8D8] transition hover:border-[#20F4FF] hover:text-white"><FileDown className="h-4 w-4" /> Export CSV</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative flex min-w-[210px] flex-1 items-center">
          <Search className="absolute left-3 h-4 w-4 text-[#747789]" />
          <input aria-label={`Search ${dimensionLabels[dimension]}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${dimensionLabels[dimension].toLowerCase()}…`} className="w-full rounded-lg border border-[#343449] bg-[#030307] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#20F4FF]" />
        </label>
        <select aria-label="Sort locations" value={sort} onChange={(event) => setSort(event.target.value as 'count' | 'name')} className="rounded-lg border border-[#343449] bg-[#030307] px-3 py-2.5 text-sm text-[#C5C8D8] outline-none focus:border-[#20F4FF]"><option value="count">Most downloads</option><option value="name">Name A–Z</option></select>
      </div>
      {filtered.length === 0 ? <p className="py-8 text-center text-sm text-[#747789]">No matching locations.</p> : (
        <div className="table-responsive max-h-[420px] overflow-y-auto">
          <table className="table w-full text-sm"><thead><tr><th className="pb-3 text-left font-medium text-[#747789]">#</th><th className="pb-3 text-left font-medium text-[#747789]">Location</th><th className="pb-3 text-right font-medium text-[#747789]">Downloads</th></tr></thead>
            <tbody>{filtered.slice(0, 100).map((item, index) => <tr key={item.label} className="cursor-pointer border-t border-[#191925] transition hover:bg-[#10101d]" onClick={() => onSelect(item.label)}><td className="py-3 text-[#747789]">{index + 1}</td><td className="py-3 pr-4"><div className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</div><div className="mt-1 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#191925]"><div className="h-full rounded-full bg-gradient-to-r from-[#FF2D95] to-[#20F4FF]" style={{ width: `${Math.max((item.count / maximum) * 100, 2)}%` }} /></div></td><td className="py-3 text-right font-mono text-white">{item.count.toLocaleString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SmallTable({ title, items }: { title: string; items: CountItem[] }) {
  return <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#C5C8D8]">{title}</h2>{items.length === 0 ? <p className="text-sm text-[#747789]">No data.</p> : <div className="space-y-3">{items.slice(0, 8).map((item) => <div key={item.label} className="flex items-center justify-between gap-4 text-sm"><span className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</span><span className="font-mono text-white">{item.count.toLocaleString()}</span></div>)}</div>}</section>;
}

function Dashboard({ token, onLock }: { token: string; onLock: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [locationDimension, setLocationDimension] = useState<LocationDimension>('countries');
  const [selectedLocation, setSelectedLocation] = useState('');

  const load = async (rangeFrom = from, rangeTo = to) => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (rangeFrom) params.set('from', rangeFrom);
    if (rangeTo) params.set('to', rangeTo);
    try {
      const response = await fetch(`/api/analytics${params.size ? `?${params}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (response.status === 401) throw new Error('Your analytics secret is no longer valid.');
      if (!response.ok) throw new Error('Analytics could not be loaded.');
      setAnalytics(await response.json());
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load('', ''); }, []);

  const applyPreset = (next: string) => {
    setPreset(next);
    if (next === 'all') { setFrom(''); setTo(''); void load('', ''); return; }
    const end = utcDate();
    const start = next === 'today' ? end : subtractDays(next === '7d' ? 6 : 29);
    setFrom(start); setTo(end); void load(start, end);
  };

  const currentItems = analytics?.[locationDimension] || [];
  const topLocation = currentItems[0]?.label || 'No location data yet';
  const rangeText = preset === 'all' ? 'All time' : `${from} → ${to}`;

  if (!analytics) return <div className="flex min-h-screen items-center justify-center bg-[#030307] text-[#C5C8D8]">{loading ? 'Loading analytics…' : error}</div>;

  return <main className="min-h-screen bg-[#030307] px-4 py-8 text-white sm:px-6"><div className="mx-auto max-w-7xl">
    <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FF2D95]"><BarChart3 className="h-4 w-4" /> Private dashboard</div><h1 className="text-3xl font-black tracking-tight md:text-4xl">Sonexis downloads</h1><p className="mt-2 text-sm text-[#747789]">{rangeText} · Updated {new Date(analytics.generatedAt).toLocaleString()}</p></div><div className="flex gap-2"><button type="button" onClick={() => void load()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={onLock} className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white"><LogOut className="h-4 w-4" /> Lock</button></div></header>
    <section className="mb-6 rounded-2xl border border-[#242435] bg-[#080811]/90 p-4"><div className="flex flex-wrap items-end gap-3"><div className="mr-2 flex items-center gap-2 text-sm font-medium text-[#C5C8D8]">Date range</div>{[['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([value, label]) => <button key={value} type="button" aria-pressed={preset === value} onClick={() => applyPreset(value)} className={`rounded-lg px-3 py-2 text-sm transition ${preset === value ? 'bg-[#FF2D95] text-white' : 'border border-[#343449] text-[#C5C8D8] hover:text-white'}`}>{label}</button>)}<div className="hidden h-8 w-px bg-[#343449] md:block" /><label className="text-xs text-[#747789]">From<input type="date" value={from} onChange={(event) => { setPreset('custom'); setFrom(event.target.value); }} className="ml-2 rounded-lg border border-[#343449] bg-[#030307] px-2 py-2 text-sm text-white outline-none focus:border-[#20F4FF]" /></label><label className="text-xs text-[#747789]">To<input type="date" value={to} onChange={(event) => { setPreset('custom'); setTo(event.target.value); }} className="ml-2 rounded-lg border border-[#343449] bg-[#030307] px-2 py-2 text-sm text-white outline-none focus:border-[#20F4FF]" /></label><button type="button" onClick={() => void load(from, to)} disabled={!from && !to} className="rounded-lg bg-[#20F4FF] px-4 py-2 text-sm font-semibold text-[#030307] disabled:opacity-40">Apply</button></div></section>
    {error && <p className="mb-5 rounded-xl border border-[#FF2D95]/30 bg-[#FF2D95]/10 p-4 text-sm text-[#FF9AC5]">{error}</p>}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<Download />} value={analytics.filteredTotal} label="Downloads in range" color="text-[#20F4FF]" detail={`${analytics.totalDownloads.toLocaleString()} all time`} /><Metric icon={<Users />} value={analytics.uniqueDownloads} label="Estimated unique downloaders" color="text-[#A778FF]" detail="Approximate, privacy-preserving" /><Metric icon={<MapPin />} value={analytics.countries.length} label="Countries" color="text-[#FF2D95]" detail="In selected range" /><Metric icon={<MapPin />} value={currentItems.length ? currentItems[0].count : 0} label={`Top ${dimensionLabels[locationDimension].toLowerCase().slice(0, -1)}`} color="text-[#62E6A5]" detail={topLocation} /></div>
    <div className="mb-6"><TrendChart downloads={analytics.days} unique={analytics.uniqueByDay} /></div>
    <section className="mb-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Where downloads came from</h2><p className="mt-1 text-sm text-[#747789]">Explore the selected date range by country, region, or city.</p></div><div className="flex rounded-lg border border-[#343449] p-1">{(Object.keys(dimensionLabels) as LocationDimension[]).map((dimension) => <button key={dimension} type="button" aria-pressed={locationDimension === dimension} onClick={() => { setLocationDimension(dimension); setSelectedLocation(''); }} className={`rounded-md px-3 py-2 text-sm transition ${locationDimension === dimension ? 'bg-[#343449] text-white' : 'text-[#747789] hover:text-white'}`}>{dimensionLabels[dimension]}</button>)}</div></div>{selectedLocation && <div className="mb-4 flex items-center justify-between rounded-xl border border-[#20F4FF]/30 bg-[#20F4FF]/5 px-4 py-3 text-sm"><span className="text-[#C5C8D8]">Selected location: <strong className="text-white">{selectedLocation}</strong></span><button type="button" onClick={() => setSelectedLocation('')} className="text-[#20F4FF] hover:text-white">Clear</button></div>}<LocationTable dimension={locationDimension} items={currentItems} onSelect={setSelectedLocation} /></section>
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"><SmallTable title="Continents" items={analytics.continents} /><SmallTable title="Time zones" items={analytics.timezones} /><SmallTable title="Devices" items={analytics.devices} /><SmallTable title="Browsers" items={analytics.browsers} /><SmallTable title="Languages" items={analytics.languages} /><SmallTable title="Referring sites" items={analytics.sources} /><SmallTable title="App versions" items={analytics.versions} /></div>
    <p className="mt-7 text-xs leading-5 text-[#747789]">Unique counts are estimates based on a one-way server fingerprint. Shared networks may undercount, while VPNs and changing IPs may overcount. No raw IP addresses are stored.</p>
  </div></main>;
}

function Login({ onUnlock }: { onUnlock: (secret: string) => void }) {
  const [secret, setSecret] = useState('');
  return <main className="flex min-h-screen items-center justify-center bg-[#030307] px-6 text-white"><form onSubmit={(event: FormEvent) => { event.preventDefault(); if (secret.trim()) onUnlock(secret.trim()); }} className="w-full max-w-md rounded-3xl border border-[#242435] bg-[#080811] p-8 shadow-2xl"><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2D95]/10 text-[#FF2D95]"><Lock className="h-5 w-5" /></div><h1 className="text-2xl font-bold">Private Sonexis analytics</h1><p className="mt-2 text-sm leading-6 text-[#747789]">Enter your analytics secret to unlock location and download data.</p><label className="mt-7 block text-xs font-semibold uppercase tracking-[0.18em] text-[#C5C8D8]" htmlFor="secret">Analytics secret</label><input id="secret" type="password" autoComplete="current-password" value={secret} onChange={(event) => setSecret(event.target.value)} className="mt-2 w-full rounded-xl border border-[#343449] bg-[#030307] px-4 py-3 text-white outline-none transition focus:border-[#20F4FF]" /><button type="submit" disabled={!secret.trim()} className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#FF2D95] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff4aa5] disabled:cursor-not-allowed disabled:opacity-50">Unlock analytics</button></form></main>;
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const unlock = (secret: string) => { sessionStorage.setItem(SESSION_KEY, secret); setToken(secret); };
  const lock = () => { sessionStorage.removeItem(SESSION_KEY); setToken(''); };
  return token ? <Dashboard token={token} onLock={lock} /> : <Login onUnlock={unlock} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
