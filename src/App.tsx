import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Github, ChevronDown, MessageSquare, Coffee } from 'lucide-react';
import { BackgroundAnimation } from './components/BackgroundAnimation';
import { NavHeader } from './components/NavHeader';

// Scroll-triggered animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

export default function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { amount: 0.6 });
  const heroWasInView = useRef(false);
  const [resetKey, setResetKey] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const lastScrollAtRef = useRef<number>(Date.now());
  const [downloadCount, setDownloadCount] = useState<number | null>(null);

  // Fetch download count on mount
  useEffect(() => {
    fetch('/api/downloads')
      .then(res => res.json())
      .then(data => setDownloadCount(data.count))
      .catch(() => {});
  }, []);

  const handleDownload = () => {
    // Increment counter
    fetch('/api/downloads', { method: 'POST' })
      .then(res => res.json())
      .then(data => setDownloadCount(data.count))
      .catch(() => {});
  };

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (heroInView && !heroWasInView.current) {
      setResetKey((prev) => prev + 1);
    }
    heroWasInView.current = heroInView;
  }, [heroInView]);

  useEffect(() => {
    const handleScroll = () => {
      lastScrollAtRef.current = Date.now();
      setShowScrollHint(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    const intervalId = window.setInterval(() => {
      if (!heroInView) {
        setShowScrollHint(false);
        return;
      }

      const idleForMs = Date.now() - lastScrollAtRef.current;
      if (idleForMs >= 2500) {
        setShowScrollHint(true);
      }
    }, 300);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.clearInterval(intervalId);
    };
  }, [heroInView]);

  return (
    <div className="min-h-screen bg-[#030307] text-white font-sans selection:bg-[#20F4FF]/30 overflow-x-hidden">
      <NavHeader
        onDownload={() => scrollTo(downloadRef)}
      />
      
      <BackgroundAnimation />

      {/* 1. APP HOME REPLICA (Hero) */}
      <section ref={heroRef} className="relative h-screen flex flex-col items-center justify-center py-12">

        {/* Title Section */}
        <div className="relative z-10 flex flex-col items-center gap-2 mb-16">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-6xl font-black tracking-tight text-[#FF2D95]">
            Sonexis
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#C5C8D8] text-lg font-medium tracking-wide">
            Shape your system audio in real time
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-5 border-t border-[#242435] pt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#747789]"
          >
            Website in progress - Projected completion: June 30, 2026
          </motion.div>
        </div>

        {/* Footer Tagline */}
        <div className="absolute inset-x-0 bottom-6 z-10 text-center text-[#747789] text-sm font-medium opacity-80">
          Made by Skanda Vyas Srinivasan
        </div>

        <AnimatePresence>
          {showScrollHint && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-14 z-10 flex flex-col items-center text-[10px] font-semibold uppercase tracking-[0.3em] text-[#747789]"
            >
              <span>Scroll Down</span>
              <ChevronDown className="mt-2 h-4 w-4 text-[#747789]" />
            </motion.div>
          )}
        </AnimatePresence>
      </section>


      {/* 2. SCROLL CONTENT - Clean, minimal */}
      <div className="relative z-10">
        {/* What It Does */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 px-6 pt-10 pb-16"
        >
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm md:text-base text-[#C5C8D8]">
              Sonexis is a Mac app for real-time, system-wide audio shaping. Build custom effect
              chains on a simple canvas, choose the effects you want, and control your Mac’s sound with
              stable, low-latency routing.
            </p>
          </div>
        </motion.section>

        {/* Download Section */}
        <motion.section
          ref={downloadRef}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="relative scroll-mt-24 py-32 px-6"
          key={`download-${resetKey}`}
        >
          <motion.div variants={fadeInUp} className="relative z-10 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Get Sonexis
            </h2>
            <p className="text-[#C5C8D8] mb-12">
              Requires macOS 14.4+
            </p>

            <motion.div variants={staggerContainer} className="grid gap-4">
              <motion.a
                variants={fadeInUp}
                href="/Sonexis.dmg"
                onClick={handleDownload}
                className="group relative block w-full rounded-2xl border border-[#242435] bg-[#060611] p-6 text-[#C5C8D8] transition-all duration-300 hover:border-[#343449] hover:text-white"
              >
                <div className="relative flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-sm uppercase tracking-[0.24em] text-[#747789]">Download</div>
                    <div className="mt-2 text-2xl font-semibold text-white transition-colors group-hover:text-[#F4F4FF]">
                      macOS Installer
                    </div>
                    <div className="mt-1 text-sm text-[#747789]">
                      Version 2.0.0
                      {downloadCount !== null && <span className="ml-2">• Total downloads: {downloadCount.toLocaleString()}</span>}
                    </div>
                    <div className="mt-3 text-xs text-[#747789]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5C8D8]">What's New</div>
                      <div className="mt-1">An all-new Audio Engine, an all-new Sonexis.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#747789] transition-colors group-hover:text-white">
                      .dmg
                    </div>
                  </div>
                </div>
              </motion.a>

              <motion.div variants={fadeInUp} className="mt-6 text-center">
                <a
                  href="/releases.html"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-[#747789] transition-colors hover:text-white"
                >
                  Release Log
                </a>
              </motion.div>

              {/* Feedback & Support */}
              <motion.div variants={fadeInUp} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeXHXSNwwz63HbKqPvYYDv422RuUv8jcTd9ZxWHJSBVwMzlSg/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#242435] bg-[#060611] text-[#C5C8D8] text-sm font-medium transition-all hover:border-[#343449] hover:text-white"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send Feedback
                </a>
                <a
                  href="https://buymeacoffee.com/golgiwaffles"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#242435] bg-[#060611] text-[#C5C8D8] text-sm font-medium transition-all hover:border-[#FFDD00] hover:text-[#FFDD00]"
                >
                  <Coffee className="w-4 h-4" />
                  Buy Me a Coffee
                </a>
              </motion.div>

            </motion.div>
          </motion.div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="py-12 px-6 bg-gradient-to-b from-transparent to-[#030307]"
          key={`footer-${resetKey}`}
        >
          <div className="max-w-6xl mx-auto flex flex-col gap-4 text-[#747789] text-sm md:flex-row md:items-center md:justify-between">
            <div>© 2025 Sonexis. Built for audio enthusiasts.</div>
            <a
              href="https://github.com/skanda-vyas-srinivasan/Laya"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[#747789] hover:text-[#20F4FF] transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </motion.footer>

      </div>
    </div>
  );
}
