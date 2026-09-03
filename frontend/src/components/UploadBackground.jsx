import React from 'react';
import { motion } from 'framer-motion';

const UploadBackground = () => {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Base dot grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <motion.svg 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <linearGradient id="traceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wire)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--wire)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--wire)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Diagonal traces and nodes */}
        <g stroke="url(#wireGrad)" strokeWidth="1" fill="none">
          {/* Top left cluster */}
          <path d="M 0 100 L 200 300 L 400 300 M 100 0 L 200 100 L 200 300" />
          <circle cx="200" cy="300" r="3" fill="var(--wire)" />
          <circle cx="200" cy="100" r="2" fill="var(--wire)" />

          {/* Bottom right cluster */}
          <path d="M 800 800 L 600 600 L 400 600 M 900 1000 L 800 900 L 800 600" />
          <circle cx="800" cy="600" r="3" fill="var(--wire)" />
          <circle cx="800" cy="900" r="2" fill="var(--wire)" />
        </g>

        {/* Glowing data streams (Static) */}
        <path
          d="M -100 200 Q 300 400 500 100 T 1100 300"
          fill="none"
          stroke="url(#traceGrad)"
          strokeWidth="2"
        />
        
        <path
          d="M 1100 800 Q 700 600 500 900 T -100 700"
          fill="none"
          stroke="url(#traceGrad)"
          strokeWidth="1.5"
        />
        
        {/* Subtle geometric floaters (Static) */}
        <rect
          x="15%" y="70%" width="40" height="40"
          fill="none" stroke="var(--trace)" strokeOpacity="0.1" strokeWidth="1"
          transform="rotate(15, 100, 100)"
        />
        <circle
          cx="85%" cy="25%" r="20"
          fill="none" stroke="var(--trace)" strokeOpacity="0.15" strokeWidth="1"
          strokeDasharray="4 4"
        />
      </motion.svg>
    </div>
  );
};

export default UploadBackground;
