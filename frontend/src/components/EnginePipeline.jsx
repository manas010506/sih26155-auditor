import React from 'react';
import { motion } from 'framer-motion';
import { IconUpload, IconCode, IconShieldCheck } from '@tabler/icons-react';

const EnginePipeline = () => {
  const nodeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  };

  const glowVariants = {
    animate: {
      opacity: [0.3, 0.7, 0.3],
      boxShadow: [
        '0 0 0 rgba(63,169,160,0)',
        '0 0 16px rgba(63,169,160,0.4)',
        '0 0 0 rgba(63,169,160,0)'
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Background scanline effect */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(rgba(27,33,43,0) 50%, rgba(63,169,160,0.03) 50%)',
        backgroundSize: '100% 4px',
        pointerEvents: 'none'
      }} />

      <div className="heading-sm" style={{ marginBottom: '24px', position: 'relative' }}>
        Audit Engine Pipeline
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
        {/* SVG paths connecting the nodes */}
        <svg width="2" height="120" style={{ position: 'absolute', left: '23px', top: '24px', overflow: 'visible', zIndex: 0 }}>
          <motion.line
            x1="1" y1="0" x2="1" y2="120"
            stroke="var(--wire)" strokeWidth="2" strokeDasharray="4 4"
            initial="hidden" animate="visible" variants={lineVariants} transition={{ duration: 1.5, delay: 0.5 }}
          />
          {/* Animated data packet */}
          <motion.circle
            cx="1" cy="0" r="3" fill="var(--trace)"
            animate={{ cy: [0, 120] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            style={{ filter: 'drop-shadow(0 0 4px var(--trace))' }}
          />
        </svg>

        {/* Step 1: Ingestion */}
        <motion.div
          initial="hidden" animate="visible" variants={nodeVariants} transition={{ duration: 0.4 }}
          style={{ display: 'flex', gap: '16px', zIndex: 1 }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '8px',
            backgroundColor: 'var(--panel-raised)', border: '1px solid var(--wire)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <IconUpload size={20} style={{ color: 'var(--ink)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>1. INGESTION</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>Raw configuration loaded</div>
          </div>
        </motion.div>

        {/* Step 2: Parser */}
        <motion.div
          initial="hidden" animate="visible" variants={nodeVariants} transition={{ duration: 0.4, delay: 0.2 }}
          style={{ display: 'flex', gap: '16px', zIndex: 1 }}
        >
          <motion.div variants={glowVariants} animate="animate" style={{
            width: '48px', height: '48px', borderRadius: '8px',
            backgroundColor: 'var(--trace-dim)', border: '1px solid var(--trace)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <IconCode size={20} style={{ color: 'var(--trace)' }} />
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--trace)' }}>2. NORMALIZATION</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>AST syntax translation</div>
          </div>
        </motion.div>

        {/* Step 3: Audit Engine */}
        <motion.div
          initial="hidden" animate="visible" variants={nodeVariants} transition={{ duration: 0.4, delay: 0.4 }}
          style={{ display: 'flex', gap: '16px', zIndex: 1 }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '8px',
            backgroundColor: 'var(--panel-raised)', border: '1px solid var(--wire)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <IconShieldCheck size={20} style={{ color: 'var(--ink)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>3. CIS AUDIT</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-dim)' }}>Benchmark evaluation</div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default EnginePipeline;
