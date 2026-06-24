import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Monitor, Zap, Settings, Repeat, Layers, Github,
  Volume2, Sparkles, Building2, Activity, ArrowLeftRight, Rabbit,
  Music2, SlidersHorizontal, Grid3X3, Timer, RefreshCw,
  AudioWaveform, CircleDot, Circle, Disc, ChevronDown, Flame,
  MessageSquare, Coffee
} from 'lucide-react';
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


const FEATURE_VIDEOS = [
  {
    id: 'auto',
    title: 'Automatic Wiring',
    desc: 'Snap effects into a chain effortlessly. We handle the signal flow.',
    src: '/videos/AutoTrim.mp4',
    accent: '#20F4FF',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'manual',
    title: 'Manual Control',
    desc: 'Design complex, custom parallel paths for total sonic control.',
    src: '/videos/RegManualTrim.mp4',
    accent: '#FF2D95',
    icon: <Settings className="w-5 h-5" />
  },
  {
    id: 'dual',
    title: 'Dual Mono Mode',
    desc: 'Separate Left and Right channel processing for independent shaping.',
    src: '/videos/DualTrim.mp4',
    accent: '#D66BFF',
    icon: <Layers className="w-5 h-5" />
  },
  {
    id: 'presets',
    title: 'Presets & Flow',
    desc: 'Save your favorite chains and switch between them instantly.',
    src: '/videos/PresetTrim.mp4',
    accent: '#FFD54A',
    icon: <Repeat className="w-5 h-5" />
  }
];

// Current Sonexis built-in effects tray order.
const EFFECTS = [
  { name: 'Night Drive', description: 'Dark, wide, bass-forward color for late-night listening', icon: Disc },
  { name: 'Chrome Punch', description: 'Adds impact, attack, and tight low-end body', icon: Zap },
  { name: 'Midnight Glow', description: 'Smooths harsh edges with warm, gentle loudness', icon: Circle },
  { name: 'Afterglow', description: 'Adds air, stereo shimmer, and a short spacious tail', icon: Sparkles },
  { name: 'Bass Boost', description: 'Makes low frequencies more powerful', icon: Volume2 },
  { name: 'Enhancer', description: 'Adds clarity, warmth, and punch in one step', icon: Flame },
  { name: 'Clarity', description: 'Makes voices and instruments clearer', icon: Sparkles },
  { name: 'Simple EQ', description: 'Adjust bass, middle, and treble', icon: SlidersHorizontal },
  { name: 'Pitch (Rubber Band)', description: 'High-quality pitch shift', icon: Music2 },
  { name: 'Reverb', description: 'Adds space and depth', icon: Building2 },
  { name: 'Stereo Widening', description: 'Makes sound feel wider and more spacious', icon: ArrowLeftRight },
  { name: 'Delay', description: 'Repeating echoes and rhythmic delays', icon: RefreshCw },
  { name: 'Tremolo', description: 'Pulsing volume modulation', icon: AudioWaveform },
  { name: 'Auto Pan', description: 'Moves sound left and right', icon: ArrowLeftRight },
  { name: 'Chorus', description: 'Thickens sound with lush modulation', icon: CircleDot },
  { name: 'Phaser', description: 'Swirling, sweeping movement', icon: Circle },
  { name: 'Flanger', description: 'Jet-like sweeping comb filter', icon: AudioWaveform },
  { name: 'Amp', description: 'Adds preamp drive and output gain', icon: Settings },
  { name: 'Bitcrusher', description: 'Retro digital grit and crunch', icon: Grid3X3 },
  { name: 'Tape Saturation', description: 'Warm, smooth analog saturation', icon: Disc },
];

export default function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const effectsWrapRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState(FEATURE_VIDEOS[0]);
  const activeVideoRef = useRef<HTMLVideoElement>(null);
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

  const { scrollYProgress: effectsProgress } = useScroll({
    target: effectsWrapRef,
    offset: ["start end", "end start"]
  });
  const effectsBlackOpacity = useTransform(
    effectsProgress,
    [0, 0.42, 0.72, 1],
    [0, 1, 1, 0]
  );

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToFeatureShowcase = () => {
    if (!videoRef.current) return;
    const sectionTop = videoRef.current.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: sectionTop,
      behavior: 'smooth',
    });
  };

  // Speed up videos
  React.useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.playbackRate = 1.5;
    }
  }, [activeVideo]);

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

  useEffect(() => {
    const preloaded = FEATURE_VIDEOS.map((video) => {
      const el = document.createElement('video');
      el.src = video.src;
      el.preload = 'auto';
      el.muted = true;
      el.playsInline = true;
      el.load();
      return el;
    });

    return () => {
      preloaded.forEach((el) => {
        el.removeAttribute('src');
        el.load();
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030307] text-white font-sans selection:bg-[#20F4FF]/30 overflow-x-hidden">
      <NavHeader
        onFeatures={scrollToFeatureShowcase}
        onEffects={() => scrollTo(effectsWrapRef)}
        onDownload={() => scrollTo(downloadRef)}
      />
      
      <BackgroundAnimation />
      <motion.div
        className="fixed inset-0 z-[1] pointer-events-none bg-[#030307]"
        style={{ opacity: effectsBlackOpacity }}
      />

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
            <div className="text-xs font-semibold tracking-[0.3em] text-[#747789] uppercase mb-4">
              What It Does
            </div>
            <p className="text-sm md:text-base text-[#C5C8D8]">
              Sonexis is a Mac app for real-time, system-wide audio shaping. Build custom effect
              chains on a simple canvas, choose the effects you want, and control your Mac’s sound with
              stable, low-latency routing.
            </p>
          </div>
        </motion.section>

        {/* Video Section - FEATURE SHOWCASE */}
        <motion.section
          ref={videoRef}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="relative scroll-mt-24 overflow-hidden px-6 py-28 md:py-36"
          key={`feature-${resetKey}`}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,7,0)_0%,rgba(8,8,18,0.84)_45%,rgba(3,3,7,0)_100%)] pointer-events-none" />

          <div className="relative z-10 max-w-6xl mx-auto">
            <motion.div
              variants={fadeInUp}
              className="mb-10 max-w-3xl md:mb-12"
            >
              <div>
                <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                  Feature Showcase
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#C5C8D8] md:text-base">
                  Explore the different modes of Sonexis, from simple automatic chains to complex manual routing.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <div
                className="relative overflow-hidden rounded-[24px] border border-[#242435] bg-[#030307] shadow-[0_24px_80px_rgba(0,0,0,0.44)]"
                style={{
                  boxShadow: `0 0 0 1px rgba(${hexToRgb(activeVideo.accent)}, 0.18), 0 30px 100px rgba(0,0,0,0.5), 0 0 70px rgba(${hexToRgb(activeVideo.accent)}, 0.16)`,
                }}
              >
                <div className="relative aspect-video">
                  <AnimatePresence mode="wait">
                    <motion.video
                      ref={activeVideoRef}
                      key={activeVideo.id}
                      initial={{ opacity: 0, scale: 1.012 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.992 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      src={activeVideo.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      onLoadedData={(e) => {
                        e.currentTarget.playbackRate = 1.5;
                      }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                {FEATURE_VIDEOS.map((video) => {
                  const isActive = activeVideo.id === video.id;

                  return (
                    <motion.button
                      key={video.id}
                      variants={fadeInUp}
                      onClick={() => setActiveVideo(video)}
                      className="group relative h-14 rounded-xl border px-3 text-left transition-all duration-300"
                      style={{
                        background: isActive
                          ? `rgba(${hexToRgb(video.accent)}, 0.14)`
                          : 'rgba(16,16,28,0.78)',
                        borderColor: isActive ? video.accent : '#242435',
                        boxShadow: isActive ? `0 0 24px rgba(${hexToRgb(video.accent)}, 0.18)` : 'none',
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300"
                          style={{
                            color: isActive ? video.accent : '#C5C8D8',
                            borderColor: isActive ? video.accent : '#343449',
                            backgroundColor: isActive ? `rgba(${hexToRgb(video.accent)}, 0.10)` : 'rgba(16,16,28,0.82)',
                          }}
                        >
                          {video.icon}
                        </div>
                        <span className="truncate text-sm font-black text-white">
                          {video.title}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Effects Carousel Section */}
        <div ref={effectsWrapRef} className="relative z-10">
          <EffectsCarousel key={`effects-${resetKey}`} />
        </div>

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

function NeonActionButton({ icon, title, subtitle, accentColor, onClick }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative w-72 h-44 rounded-2xl bg-[#060611] border border-[#242435] flex flex-col items-center justify-center gap-3 transition-all duration-300"
      style={{
        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.5)'
      }}
    >
      {/* Hover Glow & Border - strictly matching the 'Active' state styling of tabs */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 25px ${accentColor}30`,
          border: `1px solid ${accentColor}`
        }}
      />

      {/* Icon */}
      <div className="relative z-10 text-[#C5C8D8] group-hover:text-white transition-colors duration-300 transform group-hover:scale-110">
        {React.cloneElement(icon, { size: 40, strokeWidth: 1.5 })}
      </div>

      {/* Text Content */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className="text-lg font-bold text-white tracking-wide group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="text-xs font-medium text-[#747789] group-hover:text-[#C5C8D8] transition-colors">
          {subtitle}
        </div>
      </div>
    </motion.button>
  );
}

// Accent styles matching the AudioShaper neon tile across multiple hues
const ACCENT_STYLES = [
  { fill: '#4FF8FF', fillDark: '#003A44', highlight: '#C8FBFF', text: '#F8F1FF' }, // Cyan
  { fill: '#FF56D7', fillDark: '#4A0B37', highlight: '#FFD0F0', text: '#F8F1FF' }, // Pinky Magenta
  { fill: '#FFD54A', fillDark: '#4A3A00', highlight: '#FFF3B3', text: '#FFF7DE' }, // Yellow
  { fill: '#D66BFF', fillDark: '#2A0B5E', highlight: '#F3C9FF', text: '#F8F1FF' }, // Purple
  { fill: '#7CFF8A', fillDark: '#0B3F1A', highlight: '#D5FFD9', text: '#F4FFF5' }, // Light Green
];

function EffectsCarousel() {
  const baseCount = EFFECTS.length;
  const CLONE_COUNT = 5; // Number of times to clone the array for infinite scroll
  const carouselRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const momentumRafRef = useRef<number | null>(null);
  const isMomentumRef = useRef(false);
  const dragStateRef = useRef({
    isDragging: false,
    moved: false,
    startX: 0,
    startScrollLeft: 0,
    pointerId: null as number | null,
  });
  const lastMoveRef = useRef({
    x: 0,
    time: 0,
    velocity: 0,
  });

  // Create cloned items for infinite scroll
  const items = useMemo(
    () => Array.from({ length: CLONE_COUNT }, () => EFFECTS).flat(),
    []
  );

  // Card width matches AudioShaper: 110px
  const getCardWidth = useCallback(() => {
    return 110;
  }, []);

  const getGap = () => 24; // gap-6 = 24px

  // Center the scroll on mount
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    // Start at the middle clone segment
    const cardWidth = getCardWidth();
    const gap = getGap();
    const middleSegmentStart = baseCount * Math.floor(CLONE_COUNT / 2) * (cardWidth + gap);
    const centerOffset = container.clientWidth / 2 - cardWidth / 2;
    container.scrollLeft = middleSegmentStart - centerOffset;
  }, [baseCount, getCardWidth]);

  // Find the closest card to center and handle infinite loop repositioning
  const updateActiveAndReposition = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;

    const cardWidth = getCardWidth();
    const gap = getGap();
    const totalCardWidth = cardWidth + gap;
    const segmentWidth = baseCount * totalCardWidth;
    const viewportCenter = container.scrollLeft + container.clientWidth / 2;

    // Find closest card to center
    const cards = container.querySelectorAll<HTMLElement>('[data-effect-card]');
    let closestIndex = 0;
    let closestDistance = Infinity;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(viewportCenter - cardCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);

    // Infinite scroll repositioning - jump to equivalent position in middle segment
    const middleSegmentStart = segmentWidth * Math.floor(CLONE_COUNT / 2);
    const middleSegmentEnd = middleSegmentStart + segmentWidth;

    if (container.scrollLeft < segmentWidth) {
      // Scrolled too far left - jump to equivalent position in middle
      container.scrollLeft += segmentWidth * 2;
    } else if (container.scrollLeft > segmentWidth * (CLONE_COUNT - 1)) {
      // Scrolled too far right - jump to equivalent position in middle
      container.scrollLeft -= segmentWidth * 2;
    }
  }, [baseCount, getCardWidth]);

  // Snap to center after scrolling stops
  const snapToCenter = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;

    const cardWidth = getCardWidth();
    const gap = getGap();
    const totalCardWidth = cardWidth + gap;
    const viewportCenter = container.scrollLeft + container.clientWidth / 2;

    // Find closest card
    const cards = container.querySelectorAll<HTMLElement>('[data-effect-card]');
    let closestCard: HTMLElement | null = null;
    let closestDistance = Infinity;

    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(viewportCenter - cardCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });

    if (closestCard) {
      const cardCenter = closestCard.offsetLeft + closestCard.offsetWidth / 2;
      const targetScroll = cardCenter - container.clientWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  }, [getCardWidth]);

  const scrollToIndex = useCallback((index: number) => {
    const container = carouselRef.current;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('[data-effect-card]');
    const targetCard = cards[index];
    if (!targetCard) return;
    const cardCenter = targetCard.offsetLeft + targetCard.offsetWidth / 2;
    const targetScroll = cardCenter - container.clientWidth / 2;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }, []);

  const scheduleSnap = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      if (dragStateRef.current.isDragging || isMomentumRef.current) return;
      snapToCenter();
    }, 150);
  }, [snapToCenter]);

  // Handle scroll events
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateActiveAndReposition();
      });

      isScrollingRef.current = true;
      if (!dragStateRef.current.isDragging && !isMomentumRef.current) {
        scheduleSnap();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial active calculation
    updateActiveAndReposition();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [scheduleSnap, updateActiveAndReposition]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const container = carouselRef.current;
    if (!container) return;
    if (momentumRafRef.current) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    isMomentumRef.current = false;
    dragStateRef.current.isDragging = true;
    dragStateRef.current.moved = false;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startScrollLeft = container.scrollLeft;
    dragStateRef.current.pointerId = event.pointerId;
    lastMoveRef.current = {
      x: event.clientX,
      time: performance.now(),
      velocity: 0,
    };
    container.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = carouselRef.current;
    if (!container || !dragStateRef.current.isDragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastMoveRef.current.time);
    const dx = event.clientX - lastMoveRef.current.x;
    const deltaX = event.clientX - dragStateRef.current.startX;
    if (Math.abs(deltaX) > 2) {
      dragStateRef.current.moved = true;
    }
    const dragMultiplier = 1.15;
    container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX * dragMultiplier;
    lastMoveRef.current = {
      x: event.clientX,
      time: now,
      velocity: dx / dt,
    };
  };

  const startMomentum = useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;
    let velocity = lastMoveRef.current.velocity;
    if (Math.abs(velocity) < 0.01) {
      scheduleSnap();
      return;
    }
    isMomentumRef.current = true;
    let lastTime = performance.now();
    const friction = 0.94;

    const step = () => {
      const now = performance.now();
      const dt = Math.min(32, now - lastTime);
      lastTime = now;
      container.scrollLeft -= velocity * dt * 1.15;
      velocity *= Math.pow(friction, dt / 16);
      if (Math.abs(velocity) < 0.01) {
        isMomentumRef.current = false;
        momentumRafRef.current = null;
        scheduleSnap();
        return;
      }
      momentumRafRef.current = requestAnimationFrame(step);
    };

    momentumRafRef.current = requestAnimationFrame(step);
  }, [scheduleSnap]);

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const container = carouselRef.current;
    if (container && dragStateRef.current.pointerId !== null) {
      container.releasePointerCapture(dragStateRef.current.pointerId);
    }
    dragStateRef.current.isDragging = false;
    dragStateRef.current.pointerId = null;
    startMomentum();
  };

  // Get the current active effect's description
  const activeEffect = EFFECTS[activeIndex % baseCount];

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={staggerContainer}
      className="relative py-32"
    >
      <motion.div variants={fadeInUp} className="relative max-w-6xl mx-auto px-6 mb-12">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-4">Effects Showcase</h2>
          <p className="text-[#C5C8D8]">
            {EFFECTS.length} built-in effects to shape your sound.
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="relative -my-16 py-16">
      <div
        ref={carouselRef}
        className="overflow-x-auto py-16 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          ref={innerRef}
          className="flex gap-6 px-6 md:px-12"
          style={{ width: 'max-content' }}
        >
          {items.map((effect, index) => {
            const isActive = index === activeIndex;
            const effectIndex = index % baseCount;
            const styleIndex = effectIndex % ACCENT_STYLES.length;
            const Icon = effect.icon;

            return (
              <div
                key={`${effect.name}-${index}`}
                data-effect-card
                className="transition-all duration-300 ease-out"
                onClick={() => {
                  if (dragStateRef.current.moved) return;
                  scrollToIndex(index);
                }}
                style={{
                  transform: isActive ? 'scale(1.08)' : 'scale(0.92)',
                  opacity: isActive ? 1 : 0.64,
                  filter: isActive ? 'none' : 'blur(0.35px)',
                }}
              >
                <NeonTileCard
                  icon={<Icon className="w-[26px] h-[26px]" strokeWidth={1.5} />}
                  name={effect.name}
                  style={ACCENT_STYLES[styleIndex]}
                  isActive={isActive}
                />
              </div>
            );
          })}
        </div>
      </div>
      </motion.div>

      {/* Active effect description */}
      <motion.div variants={fadeInUp} className="relative text-center mt-8">
        <p className="text-[#C5C8D8] text-sm">{activeEffect.description}</p>
      </motion.div>
    </motion.section>
  );
}

// NeonTile - EXACT match to AudioShaper's NeonTile from FlowLine.swift
function NeonTileCard({
  icon,
  name,
  style,
  isActive
}: {
  icon: React.ReactNode;
  name: string;
  style: typeof ACCENT_STYLES[0];
  isActive: boolean;
}) {
  const glowStrength = isActive ? 1 : 0.55;
  const dimFill = '#060611';
  const contentColor = isActive ? style.fillDark : style.text;
  const contentShadow = isActive
    ? '0 1px 12px rgba(255,255,255,0.34)'
    : `0 0 12px rgba(${hexToRgb(style.fill)}, ${0.74 * glowStrength})`;
  const longName = name.length > 15;

  return (
    <div className="relative h-[124px] w-[124px]" style={{ margin: '24px' }}>
      {/* Tile with all layers */}
      <div
        className="relative h-full w-full overflow-hidden rounded-[28px]"
        style={{
          boxShadow: isActive
            ? `0 0 0 2px rgba(${hexToRgb(style.fill)}, 0.92), 0 0 16px rgba(${hexToRgb(style.fill)}, 0.95), 0 0 44px rgba(${hexToRgb(style.fill)}, 0.62), 0 0 96px rgba(${hexToRgb(style.fill)}, 0.36)`
            : `0 0 0 1px rgba(${hexToRgb(style.fill)}, 0.18), 0 0 18px rgba(${hexToRgb(style.fill)}, 0.16), 0 0 52px rgba(${hexToRgb(style.fill)}, 0.1)`,
        }}
      >
        {/* Layer 0: soft halo to fake projection */}
        <div
          className="absolute -inset-8 pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(${hexToRgb(style.fill)}, ${0.22 * glowStrength}) 0%, transparent 65%)`,
            filter: 'blur(6px)',
          }}
        />

        {/* Layer 1: coreFill - deep purple gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: isActive
              ? `linear-gradient(135deg, rgba(235,244,255,0.88) 0%, rgba(${hexToRgb(style.highlight)}, 0.68) 46%, rgba(130,106,220,0.76) 100%)`
              : `linear-gradient(135deg, ${dimFill} 0%, rgba(${hexToRgb(dimFill)}, 0.95) 100%)`,
          }}
        />

        {/* Layer 2: inner edge glow, no hard border */}
        <div
          className="absolute inset-[4px] rounded-[24px] pointer-events-none"
          style={{
            boxShadow: isActive
              ? `inset 0 0 0 2px rgba(255,255,255,0.28), inset 0 0 18px rgba(${hexToRgb(style.fill)}, ${0.72 * glowStrength}), inset 0 0 34px rgba(${hexToRgb(style.fill)}, ${0.48 * glowStrength})`
              : `inset 0 0 12px rgba(${hexToRgb(style.fill)}, ${0.45 * glowStrength}), inset 0 0 24px rgba(${hexToRgb(style.fill)}, ${0.26 * glowStrength})`,
          }}
        />
        <div
          className="absolute inset-[1px] rounded-[27px] pointer-events-none"
          style={{
            boxShadow: `inset 0 0 6px rgba(${hexToRgb(style.fill)}, ${0.7 * glowStrength})`,
          }}
        />

        {/* Layer 3: top highlight */}
        <div
          className="absolute inset-[8px] rounded-[20px] pointer-events-none"
          style={{
            background: isActive
              ? 'linear-gradient(135deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.12) 48%, transparent 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 100%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Layer 4: accent sheen */}
        {isActive && (
          <div
            className="absolute inset-[10px] rounded-[12px] pointer-events-none overflow-hidden"
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, transparent 0%, rgba(${hexToRgb(style.highlight)}, 0.85) 50%, transparent 100%)`,
                mixBlendMode: 'screen',
                opacity: 0.95,
                transform: 'rotate(-12deg) scale(2)',
              }}
            />
          </div>
        )}

        {/* Layer 5: glassy bloom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 60% 25%, rgba(${hexToRgb(style.highlight)}, ${0.25 * glowStrength}) 0%, transparent 55%)`,
            mixBlendMode: 'screen',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-[6px]">
          <div
            className="mb-[10px] transition-all duration-300"
            style={{
              color: contentColor,
              filter: isActive
                ? 'drop-shadow(0 1px 8px rgba(255,255,255,0.36))'
                : `drop-shadow(0 0 10px rgba(${hexToRgb(style.fill)}, ${0.9 * glowStrength}))`,
            }}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
                  className: 'h-8 w-8',
                })
              : icon}
          </div>

          <div
            className="max-w-[108px] font-black uppercase text-center leading-[1.12] transition-all duration-300"
            style={{
              fontSize: longName ? '10.5px' : '12px',
              letterSpacing: longName ? '0.07em' : isActive ? '0.13em' : '0.16em',
              color: contentColor,
              textShadow: contentShadow,
            }}
          >
            {name}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to convert hex to rgb values
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,0,0';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
