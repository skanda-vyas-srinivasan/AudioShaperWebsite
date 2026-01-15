import React from 'react';

type NavHeaderProps = {
  onFeatures: () => void;
  onDemo: () => void;
  onDownload: () => void;
};

export function NavHeader({ onFeatures, onDemo, onDownload }: NavHeaderProps) {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-[#1F1F3D] bg-[#0A0A0F]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <button
          type="button"
          onClick={onFeatures}
          className="text-xl font-black tracking-tight text-[#FF006E]"
          style={{ textShadow: '0 0 14px rgba(255, 0, 110, 0.6)' }}
        >
          Kairos
        </button>
        <nav className="flex items-center gap-6 text-sm font-semibold uppercase tracking-widest">
          <button
            type="button"
            onClick={onFeatures}
            className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
          >
            Features
          </button>
          <button
            type="button"
            onClick={onDemo}
            className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
          >
            Demo
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
          >
            Download
          </button>
        </nav>
      </div>
    </header>
  );
}
