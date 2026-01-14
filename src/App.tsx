import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Play, Monitor, Zap, Layout, Settings, Repeat, Layers } from 'lucide-react';
import { BackgroundAnimation } from './components/BackgroundAnimation';

const FEATURE_VIDEOS = [
  {
    id: 'auto',
    title: 'Automatic Wiring',
    desc: 'Snap effects into a chain effortlessly. We handle the signal flow.',
    src: '/videos/AutoTrim.mov',
    icon: <Zap className="w-5 h-5" />
  },
  {
    id: 'manual',
    title: 'Manual Control',
    desc: 'Design complex, custom parallel paths for total sonic control.',
    src: '/videos/RegManualTrim.mov',
    icon: <Settings className="w-5 h-5" />
  },
  {
    id: 'dual',
    title: 'Dual Mono Mode',
    desc: 'Separate Left and Right channel processing for independent shaping.',
    src: '/videos/DualTrim.mov',
    icon: <Layers className="w-5 h-5" />
  },
  {
    id: 'presets',
    title: 'Presets & Flow',
    desc: 'Save your favorite chains and switch between them instantly.',
    src: '/videos/PresetTrim.mov',
    icon: <Repeat className="w-5 h-5" />
  }
];

export default function App() {
  const videoRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [activeVideo, setActiveVideo] = useState(FEATURE_VIDEOS[0]);
  const activeVideoRef = useRef<HTMLVideoElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Speed up videos
  React.useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.playbackRate = 1.5;
    }
  }, [activeVideo]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans selection:bg-[#00F5FF]/30 overflow-x-hidden">
      
      <BackgroundAnimation />

      {/* 1. APP HOME REPLICA (Hero) */}
      <section className="relative h-screen flex flex-col items-center justify-between py-12">
        
        {/* Top Spacer */}
        <div className="flex-1" />

        {/* Title Section */}
        <div className="relative z-10 flex flex-col items-center gap-2 mb-16">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-6xl font-black tracking-tight text-[#FF006E]"
            style={{ textShadow: '0 0 20px rgba(255, 0, 110, 0.6)' }}>
            SoundChain
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[#B8B8D1] text-lg font-medium tracking-wide">
            Shape your system audio in real time
          </motion.p>
        </div>

        {/* The Two Big Buttons */}
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-center w-full px-4">
          
          <NeonActionButton 
            icon={<Download className="w-8 h-8 text-[#00F5FF]" />}
            title="Download App"
            subtitle="macOS Universal"
            accentColor="#00F5FF"
            onClick={() => scrollTo(downloadRef)}
          />

          <NeonActionButton 
            icon={<Play className="w-8 h-8 text-[#FF006E]" />}
            title="Watch Demos"
            subtitle="See it in action"
            accentColor="#FF006E"
            onClick={() => scrollTo(videoRef)}
          />
        
        </div>

        {/* Bottom Spacer */}
        <div className="flex-1" />

        {/* Footer Tagline */}
        <div className="relative z-10 text-[#6E6E8F] text-sm font-medium opacity-80 mb-4">
          Made by Skanda Vyas Srinivasan
        </div>
      </section>


      {/* 2. SCROLL CONTENT */}
      <div className="relative z-10 border-t border-[#1F1F3D]">
        
        {/* Video Section - FEATURE SHOWCASE */}
        <div ref={videoRef} className="py-24 px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-white mb-4 flex items-center justify-center gap-3">
                    <Monitor className="text-[#FF006E]" /> 
                    Feature Showcase
                </h2>
                <p className="text-[#B8B8D1] max-w-2xl mx-auto">
                    Explore the different modes of SoundChain, from simple automatic chains to complex manual routing.
                </p>
            </div>

            <div className="grid lg:grid-cols-[300px_1fr] gap-8 items-start">
                {/* Video Navigation Tabs */}
                <div className="flex flex-col gap-3">
                    {FEATURE_VIDEOS.map((video) => (
                        <button
                            key={video.id}
                            onClick={() => setActiveVideo(video)}
                            className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                                activeVideo.id === video.id 
                                ? 'bg-[#1A0B2E] border-[#FF006E] shadow-[0_0_15px_rgba(255,0,110,0.2)]' 
                                : 'bg-[#0F0F16] border-[#1F1F3D] hover:border-[#B8B8D1]/30'
                            }`}
                        >
                            <div className={`flex items-center gap-3 font-bold text-sm uppercase tracking-wider mb-1 ${
                                activeVideo.id === video.id ? 'text-[#FF006E]' : 'text-[#B8B8D1]'
                            }`}>
                                {video.icon}
                                {video.title}
                            </div>
                            <div className="text-xs text-[#6E6E8F] leading-relaxed">
                                {video.desc}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Video Display */}
                <div className="aspect-video w-full rounded-2xl bg-[#1A0B2E] border border-[#2D1B4E] relative overflow-hidden shadow-[0_0_40px_rgba(114,9,183,0.2)]">
                    <AnimatePresence>
                        <motion.video
                            ref={activeVideoRef}
                            key={activeVideo.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            src={activeVideo.src}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="auto"
                            onLoadedData={(e) => {
                                e.currentTarget.playbackRate = 1.5;
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </AnimatePresence>
                </div>
            </div>
        </div>

        {/* Download Section */}
        <div ref={downloadRef} className="py-24 px-6 bg-[#0F0F16] border-t border-[#1F1F3D]">
            <div className="max-w-3xl mx-auto text-center">
                 <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                    <Download className="text-[#00F5FF]" /> 
                    Get SoundChain
                </h2>
                <p className="text-[#B8B8D1] mb-12">
                    Requires macOS 13.0+ and BlackHole 2ch.
                </p>

                <div className="grid gap-4">
                    <a href="#" className="group relative block w-full p-6 rounded-2xl bg-[#1A0B2E] border border-[#00F5FF]/30 hover:border-[#00F5FF] transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.15)]">
                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <div className="text-xl font-bold text-white group-hover:text-[#00F5FF] transition-colors">Download .pkg Installer</div>
                                <div className="text-sm text-[#6E6E8F] mt-1">Version 1.0.0 • Universal (Intel/Apple Silicon)</div>
                            </div>
                            <Download className="w-6 h-6 text-[#00F5FF]" />
                        </div>
                    </a>

                    <a href="https://github.com/ExistentialAudio/BlackHole/releases" target="_blank" className="group relative block w-full p-6 rounded-2xl bg-[#1A0B2E] border border-[#FF006E]/30 hover:border-[#FF006E] transition-all hover:shadow-[0_0_30px_rgba(255,0,110,0.15)]">
                         <div className="flex items-center justify-between">
                            <div className="text-left">
                                <div className="text-xl font-bold text-white group-hover:text-[#FF006E] transition-colors">Get BlackHole Driver</div>
                                <div className="text-sm text-[#6E6E8F] mt-1">Required for system audio routing</div>
                            </div>
                            <Zap className="w-6 h-6 text-[#FF006E]" />
                        </div>
                    </a>
                </div>
            </div>
        </div>

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
      className="group relative w-72 h-44 rounded-2xl bg-[#1A0B2E] border border-[#2D1B4E] flex flex-col items-center justify-center gap-3 transition-all duration-300"
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
      <div className="relative z-10 text-[#B8B8D1] group-hover:text-white transition-colors duration-300 transform group-hover:scale-110">
        {React.cloneElement(icon, { size: 40, strokeWidth: 1.5 })}
      </div>

      {/* Text Content */}
      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className="text-lg font-bold text-white tracking-wide group-hover:text-white transition-colors">
          {title}
        </div>
        <div className="text-xs font-medium text-[#6E6E8F] group-hover:text-[#B8B8D1] transition-colors">
          {subtitle}
        </div>
      </div>
    </motion.button>
  );
}