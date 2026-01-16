import React from 'react';
import ReactDOM from 'react-dom/client';
import { ArrowLeft, Download } from 'lucide-react';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import './index.css';

type Release = {
  version: string;
  date: string;
  summary: string;
  highlights: string[];
  downloadUrl: string;
};

const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: '2025-02-01',
    summary: 'Initial public release.',
    highlights: [
      'System-wide audio shaping with stable routing.',
      'Effect canvas for building custom chains.',
      'Low-latency monitoring for real-time tweaks.'
    ],
    downloadUrl: '#'
  }
];

function ReleasesPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans selection:bg-[#00F5FF]/30 overflow-x-hidden">
      <BackgroundAnimation />
      <header className="relative z-10 border-b border-[#1F1F3D] bg-[#0A0A0F]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <a
            href="/"
            className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-[#B8B8D1] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sonexis
          </a>
          <div className="text-sm font-semibold uppercase tracking-widest text-[#6E6E8F]">All Releases</div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-24 pt-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">All Builds of Sonexis</h1>
            <p className="mt-3 max-w-2xl text-[#B8B8D1]">
              All builds of Sonexis for macOS. Download older versions if you need compatibility with a specific setup.
            </p>
          </div>

          <div className="grid gap-6">
            {RELEASES.map((release) => (
              <section
                key={release.version}
                className="rounded-2xl border border-[#2A2A3F] bg-[#0E0E16] p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-[#8B8BA3]">Version {release.version}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{release.summary}</div>
                    <div className="mt-2 text-sm text-[#6E6E8F]">Released {release.date}</div>
                  </div>
                  <a
                    href={release.downloadUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-[#34344A] bg-[#12121C] px-5 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#6A6A8A]"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-[#B8B8D1]">
                  {release.highlights.map((highlight) => (
                    <div key={highlight} className="flex items-start gap-3">
                      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#6E6E8F]" />
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
