import { motion } from 'framer-motion';

export const BackgroundAnimation = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Base Gradient - Matches AppGradients.background in Swift */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#1A0B2E] to-[#0A0A0F]" />
      
      {/* Moving Scanlines - Matches ScanlinesOverlay in Swift */}
      <motion.div
        className="absolute inset-0 opacity-100" // Opacity handled in gradient color
        initial={{ backgroundPosition: '0px 0px' }}
        animate={{ backgroundPosition: '0px 16px' }}
        transition={{ 
          repeat: Infinity, 
          ease: "linear", 
          duration: 1.6 
        }}
        style={{
          // Swift: Color.white.opacity(0.04) with 16px spacing
          backgroundImage: 'repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 16px)',
          backgroundSize: '100% 16px',
          mixBlendMode: 'screen'
        }}
      />
    </div>
  );
};
