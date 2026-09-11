import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BarChart3,
  Compass,
  Download,
  FileDown,
  Laptop,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
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

const moverDimensions = { countries: 'Countries', versions: 'Versions', devices: 'Devices', browsers: 'Browsers' } as const;
type MoverDimension = keyof typeof moverDimensions;

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'devices-versions', label: 'Devices & versions', icon: Laptop },
] as const;

const PALETTE = ['#20F4FF', '#FF2D95', '#A778FF', '#62E6A5', '#FFB454', '#747789', '#3A3A55'];

const utcDate = (date = new Date()) => date.toISOString().slice(0, 10);
const subtractDays = (count: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - count);
  return utcDate(date);
};

function previousRange(from: string, to: string): [string, string] {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1;
  const prevTo = new Date(fromDate);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - (spanDays - 1));
  return [utcDate(prevFrom), utcDate(prevTo)];
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

function computeMovers(current: CountItem[], previous: CountItem[] | null) {
  if (!previous) return { rising: [], falling: [] };
  const prevMap = new Map(previous.map((item) => [item.label, item.count]));
  const currMap = new Map(current.map((item) => [item.label, item.count]));
  const labels = new Set([...prevMap.keys(), ...currMap.keys()]);
  const diffs = Array.from(labels)
    .map((label) => {
      const curr = currMap.get(label) || 0;
      const prev = prevMap.get(label) || 0;
      return { label, curr, prev, delta: curr - prev, isNew: prev === 0 && curr > 0 };
    })
    .filter((item) => item.delta !== 0);
  const rising = diffs.filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
  const falling = diffs.filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
  return { rising, falling };
}

function TrendBadge({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) return <span className="text-xs font-medium text-[#747789]">No prior data</span>;
  if (change === 0) return <span className="text-xs font-medium text-[#747789]">No change</span>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? 'text-[#62E6A5]' : 'text-[#FF6B6B]'}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}
      {change.toFixed(1)}%
    </span>
  );
}

function Metric({
  icon,
  value,
  label,
  color,
  detail,
  change,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  detail?: string;
  change?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex items-center gap-2 [&>svg]:h-5 [&>svg]:w-5 ${color}`}>{icon}</div>
        {change !== undefined && <TrendBadge change={change} />}
      </div>
      <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-[#C5C8D8]">{label}</div>
      {detail && <div className="mt-2 truncate text-xs text-[#747789]" title={detail}>{detail}</div>}
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
          <h3 className="text-lg font-semibold text-white">Download activity</h3>
          <p className="mt-1 text-sm text-[#747789]">Daily clicks with unique downloader estimates</p>
        </div>
        <div className="flex gap-4 text-xs text-[#C5C8D8]">
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#20F4FF]" />Downloads</span>
          <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#FF2D95]" />Unique</span>
        </div>
      </div>
      {ordered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#747789]">No downloads in this date range.</p>
      ) : (
        <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-7 pt-5">
          {ordered.map((item) => {
            const uniqueCount = uniqueMap.get(item.label) || 0;
            return (
              <div key={item.label} className="group flex h-full min-w-[22px] flex-1 flex-col items-center justify-end gap-1">
                <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                  <div
                    className="w-2.5 rounded-t bg-[#20F4FF]/80 transition-all group-hover:bg-[#20F4FF]"
                    style={{ height: item.count ? `${Math.max((item.count / maximum) * 100, 3)}%` : '0%' }}
                    title={`${item.label}: ${item.count} downloads`}
                  />
                  <div
                    className="w-2.5 rounded-t bg-[#FF2D95]/80 transition-all group-hover:bg-[#FF2D95]"
                    style={{ height: uniqueCount ? `${Math.max((uniqueCount / maximum) * 100, 3)}%` : '0%' }}
                    title={`${item.label}: ${uniqueCount} unique`}
                  />
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

function TopMovers({
  dimension,
  onDimensionChange,
  current,
  previous,
  enabled,
}: {
  dimension: MoverDimension;
  onDimensionChange: (dimension: MoverDimension) => void;
  current: Analytics;
  previous: Analytics | null;
  enabled: boolean;
}) {
  const { rising, falling } = useMemo(
    () => computeMovers(current[dimension], previous ? previous[dimension] : null),
    [current, previous, dimension],
  );

  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Top movers</h3>
          <p className="mt-1 text-sm text-[#747789]">Biggest changes vs the previous equivalent period.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[#343449] p-1">
          {(Object.keys(moverDimensions) as MoverDimension[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={dimension === key}
              onClick={() => onDimensionChange(key)}
              className={`rounded-md px-3 py-1.5 text-xs transition ${
                dimension === key ? 'bg-[#343449] text-white' : 'text-[#747789] hover:text-white'
              }`}
            >
              {moverDimensions[key]}
            </button>
          ))}
        </div>
      </div>
      {!enabled ? (
        <p className="py-8 text-center text-sm text-[#747789]">Pick a specific date range (not "All time") to see movers.</p>
      ) : rising.length === 0 && falling.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#747789]">No change from the previous period.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#62E6A5]">
              <TrendingUp className="h-3.5 w-3.5" /> Rising
            </div>
            {rising.length === 0 ? <p className="text-sm text-[#747789]">Nothing rising.</p> : (
              <div className="space-y-3">
                {rising.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</span>
                    <span className="shrink-0 font-mono text-[#62E6A5]">{item.isNew ? 'New' : `+${item.delta.toLocaleString()}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#FF6B6B]">
              <TrendingDown className="h-3.5 w-3.5" /> Falling
            </div>
            {falling.length === 0 ? <p className="text-sm text-[#747789]">Nothing falling.</p> : (
              <div className="space-y-3">
                {falling.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</span>
                    <span className="shrink-0 font-mono text-[#FF6B6B]">{item.delta.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function VersionAdoption({ items }: { items: CountItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const top = items.slice(0, 6);
  const restTotal = items.slice(6).reduce((sum, item) => sum + item.count, 0);
  const segments = restTotal > 0 ? [...top, { label: 'Other versions', count: restTotal }] : top;
  const leader = items[0];

  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5 md:p-6">
      <h3 className="text-lg font-semibold text-white">Version adoption</h3>
      <p className="mt-1 text-sm text-[#747789]">Share of downloads by app version in the selected range.</p>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-[#747789]">No version data in this range.</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#C5C8D8]">
            <strong className="text-white">{leader.label}</strong> leads with{' '}
            <strong className="text-white">{((leader.count / total) * 100).toFixed(1)}%</strong> of downloads.
          </p>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-[#191925]">
            {segments.map((item, index) => (
              <div
                key={item.label}
                style={{ width: `${(item.count / total) * 100}%`, backgroundColor: PALETTE[index % PALETTE.length] }}
                title={`${item.label}: ${((item.count / total) * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className="mt-5 space-y-2.5">
            {segments.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[#C5C8D8]">
                  <i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} />
                  <span className="truncate" title={item.label}>{item.label}</span>
                </span>
                <span className="shrink-0 font-mono text-white">{((item.count / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function LocationTable({ dimension, items, onSelect }: { dimension: LocationDimension; items: CountItem[]; onSelect: (label: string) => void }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'count' | 'name'>('count');
  const filtered = useMemo(
    () =>
      items
        .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (sort === 'count' ? b.count - a.count : a.label.localeCompare(b.label))),
    [items, query, sort],
  );
  const maximum = Math.max(...items.map((item) => item.count), 1);

  const exportCsv = () => {
    const rows = [['Location', 'Downloads'], ...filtered.map((item) => [item.label, String(item.count)])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
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
          <h3 className="text-lg font-semibold text-white">{dimensionLabels[dimension]}</h3>
          <p className="mt-1 text-sm text-[#747789]">Click a row to select a location.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border border-[#343449] px-3 py-2 text-xs font-medium text-[#C5C8D8] transition hover:border-[#20F4FF] hover:text-white"
        >
          <FileDown className="h-4 w-4" /> Export CSV
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative flex min-w-[210px] flex-1 items-center">
          <Search className="absolute left-3 h-4 w-4 text-[#747789]" />
          <input
            aria-label={`Search ${dimensionLabels[dimension]}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${dimensionLabels[dimension].toLowerCase()}…`}
            className="w-full rounded-lg border border-[#343449] bg-[#030307] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#20F4FF]"
          />
        </label>
        <select
          aria-label="Sort locations"
          value={sort}
          onChange={(event) => setSort(event.target.value as 'count' | 'name')}
          className="rounded-lg border border-[#343449] bg-[#030307] px-3 py-2.5 text-sm text-[#C5C8D8] outline-none focus:border-[#20F4FF]"
        >
          <option value="count">Most downloads</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#747789]">No matching locations.</p>
      ) : (
        <div className="table-responsive max-h-[420px] overflow-y-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr>
                <th className="pb-3 text-left font-medium text-[#747789]">#</th>
                <th className="pb-3 text-left font-medium text-[#747789]">Location</th>
                <th className="pb-3 text-right font-medium text-[#747789]">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((item, index) => (
                <tr
                  key={item.label}
                  className="cursor-pointer border-t border-[#191925] transition hover:bg-[#10101d]"
                  onClick={() => onSelect(item.label)}
                >
                  <td className="py-3 text-[#747789]">{index + 1}</td>
                  <td className="py-3 pr-4">
                    <div className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</div>
                    <div className="mt-1 h-1 w-full max-w-[260px] overflow-hidden rounded-full bg-[#191925]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF2D95] to-[#20F4FF]"
                        style={{ width: `${Math.max((item.count / maximum) * 100, 2)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono text-white">{item.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SmallTable({ title, items }: { title: string; items: CountItem[] }) {
  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#C5C8D8]">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-[#747789]">No data.</p>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 8).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</span>
              <span className="font-mono text-white">{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#080811] text-[#20F4FF]"><Icon className="h-[18px] w-[18px]" /></div>
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-[#747789]">{subtitle}</p>
      </div>
    </div>
  );
}

function Sidebar({ active, mobile = false }: { active: string; mobile?: boolean }) {
  const scrollTo = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (mobile) {
    return (
      <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={scrollTo(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
              active === id ? 'border-[#20F4FF] bg-[#20F4FF]/10 text-white' : 'border-[#343449] text-[#747789]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#191925] px-5 py-8 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FF2D95]">
        <BarChart3 className="h-4 w-4" /> Sonexis
      </div>
      <nav className="flex flex-col gap-1">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            onClick={scrollTo(id)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition ${
              active === id ? 'bg-[#080811] text-white' : 'text-[#747789] hover:bg-[#080811]/60 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

function Dashboard({ token, onLock }: { token: string; onLock: () => void }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [previous, setPrevious] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [locationDimension, setLocationDimension] = useState<LocationDimension>('countries');
  const [moverDimension, setMoverDimension] = useState<MoverDimension>('countries');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [activeSection, setActiveSection] = useState<string>('overview');

  const load = async (rangeFrom: string, rangeTo: string) => {
    setLoading(true);
    setError('');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const currentParams = new URLSearchParams();
      if (rangeFrom) currentParams.set('from', rangeFrom);
      if (rangeTo) currentParams.set('to', rangeTo);
      const requests = [fetch(`/api/analytics${currentParams.size ? `?${currentParams}` : ''}`, { headers, cache: 'no-store' })];

      const hasComparablePrior = Boolean(rangeFrom && rangeTo);
      if (hasComparablePrior) {
        const [prevFrom, prevTo] = previousRange(rangeFrom, rangeTo);
        requests.push(fetch(`/api/analytics?from=${prevFrom}&to=${prevTo}`, { headers, cache: 'no-store' }));
      }

      const responses = await Promise.all(requests);
      if (responses.some((response) => response.status === 401)) throw new Error('Your analytics secret is no longer valid.');
      if (responses.some((response) => !response.ok)) throw new Error('Analytics could not be loaded.');

      const [currentJson, previousJson] = await Promise.all(responses.map((response) => response.json()));
      setAnalytics(currentJson);
      setPrevious(hasComparablePrior ? previousJson : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const end = utcDate();
    const start = subtractDays(29);
    setFrom(start);
    setTo(end);
    void load(start, end);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    SECTIONS.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [analytics]);

  const applyPreset = (next: string) => {
    setPreset(next);
    if (next === 'all') {
      setFrom('');
      setTo('');
      void load('', '');
      return;
    }
    const end = utcDate();
    const start = next === 'today' ? end : subtractDays(next === '7d' ? 6 : 29);
    setFrom(start);
    setTo(end);
    void load(start, end);
  };

  const currentItems = analytics?.[locationDimension] || [];
  const topLocation = currentItems[0]?.label || 'No location data yet';
  const rangeText = preset === 'all' ? 'All time' : `${from} → ${to}`;
  const hasComparison = Boolean(previous);

  if (!analytics) {
    return <div className="flex min-h-screen items-center justify-center bg-[#030307] text-[#C5C8D8]">{loading ? 'Loading analytics…' : error}</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#030307] text-white">
      <Sidebar active={activeSection} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Download analytics</h1>
              <p className="mt-2 text-sm text-[#747789]">{rangeText} · Updated {new Date(analytics.generatedAt).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load(from, to)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                type="button"
                onClick={onLock}
                className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Lock
              </button>
            </div>
          </header>

          <Sidebar active={activeSection} mobile />

          <section className="mb-8 rounded-2xl border border-[#242435] bg-[#080811]/90 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="mr-2 flex items-center gap-2 text-sm font-medium text-[#C5C8D8]">Date range</div>
              {[['all', 'All time'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={preset === value}
                  onClick={() => applyPreset(value)}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    preset === value ? 'bg-[#FF2D95] text-white' : 'border border-[#343449] text-[#C5C8D8] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="hidden h-8 w-px bg-[#343449] md:block" />
              <label className="text-xs text-[#747789]">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setPreset('custom');
                    setFrom(event.target.value);
                  }}
                  className="ml-2 rounded-lg border border-[#343449] bg-[#030307] px-2 py-2 text-sm text-white outline-none focus:border-[#20F4FF]"
                />
              </label>
              <label className="text-xs text-[#747789]">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setPreset('custom');
                    setTo(event.target.value);
                  }}
                  className="ml-2 rounded-lg border border-[#343449] bg-[#030307] px-2 py-2 text-sm text-white outline-none focus:border-[#20F4FF]"
                />
              </label>
              <button
                type="button"
                onClick={() => void load(from, to)}
                disabled={!from && !to}
                className="rounded-lg bg-[#20F4FF] px-4 py-2 text-sm font-semibold text-[#030307] disabled:opacity-40"
              >
                Apply
              </button>
            </div>
            <p className="mt-3 text-xs text-[#747789]">
              {hasComparison ? 'Growth badges compare this range to the equivalent prior period.' : 'Pick a specific date range to see growth vs. the previous period.'}
            </p>
          </section>

          {error && <p className="mb-6 rounded-xl border border-[#FF2D95]/30 bg-[#FF2D95]/10 p-4 text-sm text-[#FF9AC5]">{error}</p>}

          <section id="overview" className="scroll-mt-8 mb-12">
            <SectionHeading icon={BarChart3} title="Overview" subtitle="Headline numbers for the selected range." />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                icon={<Download />}
                value={analytics.filteredTotal}
                label="Downloads in range"
                color="text-[#20F4FF]"
                detail={`${analytics.totalDownloads.toLocaleString()} all time`}
                change={hasComparison ? pctChange(analytics.filteredTotal, previous!.filteredTotal) : undefined}
              />
              <Metric
                icon={<Users />}
                value={analytics.uniqueDownloads}
                label="Estimated unique downloaders"
                color="text-[#A778FF]"
                detail="Approximate, privacy-preserving"
                change={hasComparison ? pctChange(analytics.uniqueDownloads, previous!.uniqueDownloads) : undefined}
              />
              <Metric
                icon={<MapPin />}
                value={analytics.countries.length}
                label="Countries"
                color="text-[#FF2D95]"
                detail="In selected range"
                change={hasComparison ? pctChange(analytics.countries.length, previous!.countries.length) : undefined}
              />
              <Metric
                icon={<Compass />}
                value={currentItems.length ? currentItems[0].count : 0}
                label="Top location"
                color="text-[#62E6A5]"
                detail={topLocation}
              />
            </div>
          </section>

          <section id="trends" className="scroll-mt-8 mb-12 space-y-6">
            <SectionHeading icon={TrendingUp} title="Trends" subtitle="Daily activity and what's rising or falling." />
            <TrendChart downloads={analytics.days} unique={analytics.uniqueByDay} />
            <TopMovers
              dimension={moverDimension}
              onDimensionChange={setMoverDimension}
              current={analytics}
              previous={previous}
              enabled={hasComparison}
            />
          </section>

          <section id="locations" className="scroll-mt-8 mb-12">
            <SectionHeading icon={MapPin} title="Locations" subtitle="Explore the selected range by country, region, or city." />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-lg border border-[#343449] p-1">
                {(Object.keys(dimensionLabels) as LocationDimension[]).map((dimension) => (
                  <button
                    key={dimension}
                    type="button"
                    aria-pressed={locationDimension === dimension}
                    onClick={() => {
                      setLocationDimension(dimension);
                      setSelectedLocation('');
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      locationDimension === dimension ? 'bg-[#343449] text-white' : 'text-[#747789] hover:text-white'
                    }`}
                  >
                    {dimensionLabels[dimension]}
                  </button>
                ))}
              </div>
              {selectedLocation && (
                <div className="flex items-center gap-3 rounded-xl border border-[#20F4FF]/30 bg-[#20F4FF]/5 px-4 py-2 text-sm">
                  <span className="text-[#C5C8D8]">Selected: <strong className="text-white">{selectedLocation}</strong></span>
                  <button type="button" onClick={() => setSelectedLocation('')} className="text-[#20F4FF] hover:text-white">Clear</button>
                </div>
              )}
            </div>
            <LocationTable dimension={locationDimension} items={currentItems} onSelect={setSelectedLocation} />
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <SmallTable title="Continents" items={analytics.continents} />
              <SmallTable title="Time zones" items={analytics.timezones} />
            </div>
          </section>

          <section id="devices-versions" className="scroll-mt-8 mb-4">
            <SectionHeading icon={Laptop} title="Devices & versions" subtitle="What downloaders are running, and which app version they're on." />
            <div className="mb-6">
              <VersionAdoption items={analytics.versions} />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <SmallTable title="Devices" items={analytics.devices} />
              <SmallTable title="Browsers" items={analytics.browsers} />
              <SmallTable title="Languages" items={analytics.languages} />
              <SmallTable title="Referring sites" items={analytics.sources} />
            </div>
          </section>

          <p className="mt-4 text-xs leading-5 text-[#747789]">
            Unique counts are estimates based on a one-way server fingerprint. Shared networks may undercount, while VPNs and changing IPs may
            overcount. No raw IP addresses are stored.
          </p>
        </div>
      </main>
    </div>
  );
}

function Login({ onUnlock }: { onUnlock: (secret: string) => void }) {
  const [secret, setSecret] = useState('');
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030307] px-6 text-white">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (secret.trim()) onUnlock(secret.trim());
        }}
        className="w-full max-w-md rounded-3xl border border-[#242435] bg-[#080811] p-8 shadow-2xl"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2D95]/10 text-[#FF2D95]"><Lock className="h-5 w-5" /></div>
        <h1 className="text-2xl font-bold">Private Sonexis analytics</h1>
        <p className="mt-2 text-sm leading-6 text-[#747789]">Enter your analytics secret to unlock location and download data.</p>
        <label className="mt-7 block text-xs font-semibold uppercase tracking-[0.18em] text-[#C5C8D8]" htmlFor="secret">Analytics secret</label>
        <input
          id="secret"
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#343449] bg-[#030307] px-4 py-3 text-white outline-none transition focus:border-[#20F4FF]"
        />
        <button
          type="submit"
          disabled={!secret.trim()}
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#FF2D95] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff4aa5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Unlock analytics
        </button>
      </form>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const unlock = (secret: string) => {
    sessionStorage.setItem(SESSION_KEY, secret);
    setToken(secret);
  };
  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken('');
  };
  return token ? <Dashboard token={token} onLock={lock} /> : <Login onUnlock={unlock} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
