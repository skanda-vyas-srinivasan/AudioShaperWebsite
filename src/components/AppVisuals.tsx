import React from 'react';
import { motion } from 'framer-motion';

export const NodeBlock = ({ title, type, x, y, delay = 0 }: any) => {
  const colors = {
    bass: { border: '#00F5FF', fill: '#007C88' },
    reverb: { border: '#FF006E', fill: '#7A1F4A' },
    clarity: { border: '#8B3DFF', fill: '#3A0B73' },
  };
  
  const style = colors[type as keyof typeof colors] || colors.bass;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: y + 20 }}
      animate={{ opacity: 1, scale: 1, y: y }}
      transition={{ delay, duration: 0.5, type: 'spring' }}
      className="absolute flex flex-col items-center justify-center w-32 h-24 rounded-xl backdrop-blur-md"
      style={{
        left: x,
        top: y,
        backgroundColor: `${style.fill}CC`, // 80% opacity
        border: `1px solid ${style.border}`,
        boxShadow: `0 0 15px ${style.border}40`,
      }}
    >
      <div className="text-xs font-bold tracking-widest text-white uppercase opacity-70 font-mono mb-1">Effect</div>
      <div className="text-sm font-bold text-white font-rounded">{title}</div>
      
      {/* Visual knobs */}
      <div className="flex gap-2 mt-3">
        <div className="w-6 h-6 rounded-full border-2 border-white/20 relative">
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/60" />
        </div>
        <div className="w-6 h-6 rounded-full border-2 border-white/20 relative">
             <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white/60" transform="rotate(45)" />
        </div>
      </div>
    </motion.div>
  );
};

export const Wire = ({ start, end, delay = 0.5 }: any) => {
    // Simple bezier curve for the wire
    const midX = (start.x + end.x) / 2;
    const path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;

    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
            <motion.path
                d={path}
                fill="none"
                stroke="#3D3D5C"
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay, duration: 0.8 }}
            />
             <motion.path
                d={path}
                fill="none"
                stroke="#00F5FF"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay, duration: 0.8 }}
            />
        </svg>
    );
};
