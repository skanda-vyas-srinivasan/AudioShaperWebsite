import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowLeft } from 'lucide-react';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import './index.css';

type Release = {
  version: string;
  date: string;
  summary: string;
  highlights: string[];
};

const RELEASES: Release[] = [
  {
    version: '2.0.0',
    date: '2026-06-23',
    summary: 'Redesigned effect tray and plugin workflow.',
    highlights: [
      'Effect tray reorganized into Signature, Tone and EQ, Space, Motion, and Texture categories.',
      'New Signature effects: Night Drive, Chrome Punch, Midnight Glow, and Afterglow.',
      'Plugin rows now match built-in effects with cleaner labels and drag previews.',
      'Favorites and search polish for faster effect selection.'
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-05',
    summary: 'Plugin support and streamlined header controls.',
    highlights: [
      'Audio Unit (AU) plugins now supported in the effects tray.',
      'Recording is always available from the header.',
      'Limiter is always-on for safer output.',
      'Tutorial updated with a new Record step.'
    ],
  },
  {
    version: '1.0.1',
    date: '2026-01-28',
    summary: 'Preset sharing and Enhancer effect.',
    highlights: [
      'Import/export your presets as a single file.',
      'Improved system input/output restore on stop.',
      'New Enhancer effect for quick sonic polish.',
      'Preset list actions and hover polish.'
    ]
  },
  {
    version: '1.0.0',
    date: '2026-01-21',
    summary: 'Initial public release.',
    highlights: [
      'System-wide audio shaping with stable routing.',
      'Effect canvas for building custom chains.',
      'Low-latency monitoring for real-time tweaks.'
    ]
  }
];

function ReleasesPage() {
  return (
    <div className="min-h-screen bg-[#030307] text-white font-sans selection:bg-[#20F4FF]/30 overflow-x-hidden">
      <BackgroundAnimation />
      <header className="relative z-10 border-b border-[#242435] bg-[#030307]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a
            href="/"
            className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-[#C5C8D8] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sonexis
          </a>
          <div className="text-sm font-semibold uppercase tracking-widest text-[#747789]">Release Log</div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">Release Log</h1>
          </div>

          <div className="grid gap-6">
            {RELEASES.map((release) => (
              <section
                key={release.version}
                className="rounded-2xl border border-[#242435] bg-[#060611] p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[#747789]">Version {release.version}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{release.summary}</div>
                    <div className="mt-2 text-sm text-[#747789]">Released {release.date}</div>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-[#C5C8D8]">
                  {release.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-3">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#747789]" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReleasesPage />
  </React.StrictMode>
);
