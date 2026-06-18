import React from 'react';

type NavHeaderProps = {
  onFeatures: () => void;
  onEffects: () => void;
  onDownload: () => void;
};

export function NavHeader({ onFeatures, onEffects, onDownload }: NavHeaderProps) {
  return (
    <header className="fixed right-4 top-5 z-50 sm:right-6">
      <nav className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.22em] sm:gap-6 sm:text-sm">
        <button
          type="button"
          onClick={onFeatures}
          className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
        >
          Features
        </button>
        <button
          type="button"
          onClick={onEffects}
          className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
        >
          Effects
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="text-[#B8B8D1] transition-colors hover:text-[#00F5FF]"
        >
          Download
        </button>
      </nav>
    </header>
  );
}
