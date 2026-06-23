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
          className="text-[#C5C8D8] transition-colors hover:text-[#20F4FF]"
        >
          Features
        </button>
        <button
          type="button"
          onClick={onEffects}
          className="text-[#C5C8D8] transition-colors hover:text-[#20F4FF]"
        >
          Effects
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="text-[#C5C8D8] transition-colors hover:text-[#20F4FF]"
        >
          Download
        </button>
      </nav>
    </header>
  );
}
