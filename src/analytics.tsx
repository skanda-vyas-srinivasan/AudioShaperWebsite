import React, { FormEvent, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BarChart3, Download, Lock, LogOut, MapPin, RefreshCw, Users } from 'lucide-react';
import './index.css';

type CountItem = { label: string; count: number };
type Analytics = {
  totalDownloads: number;
  trackedDownloads: number;
  uniqueDownloads: number;
  generatedAt: string;
  days: CountItem[];
  uniqueByDay: CountItem[];
  continents: CountItem[];
  countries: CountItem[];
  regions: CountItem[];
  cities: CountItem[];
  timezones: CountItem[];
  devices: CountItem[];
  browsers: CountItem[];
  languages: CountItem[];
  sources: CountItem[];
  versions: CountItem[];
};

const SESSION_KEY = 'sonexis-analytics-token';

function StatTable({ title, items }: { title: string; items: CountItem[] }) {
  const maximum = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#C5C8D8]">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-[#747789]">No tracked downloads yet.</p>
      ) : (
        <div className="space-y-4">
          {items.slice(0, 50).map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-[#C5C8D8]" title={item.label}>{item.label}</span>
                <span className="font-mono text-white">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#191925]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF2D95] to-[#20F4FF]"
                  style={{ width: `${Math.max((item.count / maximum) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AnalyticsPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [tokenInput, setTokenInput] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async (secret: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analytics', {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
      });
      if (response.status === 401) throw new Error('That analytics secret is not valid.');
      if (!response.ok) throw new Error('Analytics could not be loaded.');

      setAnalytics(await response.json());
      sessionStorage.setItem(SESSION_KEY, secret);
      setToken(secret);
    } catch (loadError) {
      setAnalytics(null);
      setError(loadError instanceof Error ? loadError.message : 'Analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadAnalytics(token);
  }, []);

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    if (tokenInput.trim()) void loadAnalytics(tokenInput.trim());
  };

  const lock = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setToken('');
    setTokenInput('');
    setAnalytics(null);
    setError('');
  };

  if (!analytics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030307] px-6 text-white">
        <form onSubmit={unlock} className="w-full max-w-md rounded-3xl border border-[#242435] bg-[#080811] p-8 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF2D95]/10 text-[#FF2D95]">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold">Private Sonexis analytics</h1>
          <p className="mt-2 text-sm leading-6 text-[#747789]">
            Enter the private analytics secret configured in Vercel. It is kept only in this browser tab.
          </p>
          <label className="mt-7 block text-xs font-semibold uppercase tracking-[0.18em] text-[#C5C8D8]" htmlFor="secret">
            Analytics secret
          </label>
          <input
            id="secret"
            type="password"
            autoComplete="current-password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#343449] bg-[#030307] px-4 py-3 text-white outline-none transition focus:border-[#20F4FF]"
          />
          {error && <p className="mt-3 text-sm text-[#FF6B9F]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#FF2D95] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff4aa5] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Unlocking…' : 'Unlock analytics'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030307] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#FF2D95]">
              <BarChart3 className="h-4 w-4" /> Private dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Sonexis downloads</h1>
            <p className="mt-2 text-sm text-[#747789]">
              Updated {new Date(analytics.generatedAt).toLocaleString()}. No raw IP addresses are stored.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadAnalytics(token)} disabled={loading} className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" onClick={lock} className="flex items-center gap-2 rounded-xl border border-[#343449] px-4 py-2.5 text-sm text-[#C5C8D8] transition hover:text-white">
              <LogOut className="h-4 w-4" /> Lock
            </button>
          </div>
        </header>

        {error && <p className="mb-5 rounded-xl border border-[#FF2D95]/30 bg-[#FF2D95]/10 p-4 text-sm text-[#FF9AC5]">{error}</p>}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Download />} value={analytics.totalDownloads} label="All-time clicks" color="text-[#20F4FF]" />
          <Metric icon={<MapPin />} value={analytics.trackedDownloads} label="Location-tracked clicks" color="text-[#FF2D95]" />
          <Metric icon={<Users />} value={analytics.uniqueDownloads} label="Estimated unique downloaders" color="text-[#A778FF]" />
          <Metric icon={<BarChart3 />} value={analytics.countries.length} label="Countries represented" color="text-[#62E6A5]" />
        </div>

        <p className="mb-6 text-xs leading-5 text-[#747789]">
          Unique counts are privacy-preserving estimates based on a one-way server fingerprint and may differ by about 1%. Shared networks can undercount; VPNs or changing IPs can overcount.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <StatTable title="Downloads by day" items={analytics.days} />
          <StatTable title="Unique downloaders by day" items={analytics.uniqueByDay} />
          <StatTable title="Countries" items={analytics.countries} />
          <StatTable title="Regions" items={analytics.regions} />
          <StatTable title="Cities" items={analytics.cities} />
          <StatTable title="Continents" items={analytics.continents} />
          <StatTable title="Time zones" items={analytics.timezones} />
          <StatTable title="Devices" items={analytics.devices} />
          <StatTable title="Browsers" items={analytics.browsers} />
          <StatTable title="Languages" items={analytics.languages} />
          <StatTable title="Referring sites" items={analytics.sources} />
          <StatTable title="App versions" items={analytics.versions} />
        </div>
      </div>
    </main>
  );
}

function Metric({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#242435] bg-[#080811]/90 p-5">
      <div className={`mb-4 [&>svg]:h-5 [&>svg]:w-5 ${color}`}>{icon}</div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      <div className="mt-1 text-sm text-[#747789]">{label}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AnalyticsPage /></React.StrictMode>,
);
