import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/* Animates a number from 0 to target when the component mounts */
const AnimatedScore = ({ target, duration = 1200 }) => {
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target.toString());
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target).toString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span>{display}</span>;
};

/* Score bands calibrated against the real penalty engine:
   penalty = critical×20 + high×10 + medium×5 + low×2
   A 15-finding config with mixed severity typically scores 0–40.
   A light/passing config (3 findings) scores ~60–80.
   Bands are spaced to actually differentiate real audit outputs. */
const scoreLabel = (s) => {
  if (s >= 70) return 'GOOD';
  if (s >= 40) return 'FAIR';
  if (s >= 20) return 'POOR';
  return 'CRITICAL';
};

const scoreColor = (s) => {
  if (s >= 70) return 'var(--trace)';
  if (s >= 40) return 'var(--severity-low)';
  if (s >= 20) return 'var(--severity-medium)';
  return 'var(--severity-critical)';
};

const ComplianceGauge = ({ score, breakdown }) => {
  const radius = 40;
  const circumference = Math.PI * radius; // semi-circle
  const dashoffset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      title={breakdown ? `Formula: ${breakdown.formula}\nRules Evaluated: ${breakdown.rules_evaluated}\nRules Failed: ${breakdown.rules_failed}\nFailed Weight: ${breakdown.failed_weight}\nTotal Weight: ${breakdown.total_weight}` : undefined}
    >
      {/* SVG Arc + LED Ticks */}
      <div style={{ position: 'relative', width: '140px', height: '80px', marginBottom: '12px' }}>
        <svg width="140" height="80" viewBox="0 0 120 75" style={{ position: 'absolute', inset: 0 }}>
          {/* Background arc (subtle) */}
          <path
            d="M 10 60 A 40 40 0 0 1 110 60"
            fill="none"
            stroke="var(--panel-raised)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Foreground arc (animated on mount) */}
          <motion.path
            d="M 10 60 A 40 40 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* LED tick marks around the arc — 5 ticks at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const angle = (pct / 100) * Math.PI; // 0 to π radians
            const x = 60 + 50 * Math.cos(angle);
            const y = 60 + 50 * Math.sin(angle);

            const isActive = pct <= score;
            const ledColor = isActive
              ? score >= 70
                ? 'var(--trace)'
                : score >= 40
                ? 'var(--severity-low)'
                : score >= 20
                ? 'var(--severity-medium)'
                : 'var(--severity-critical)'
              : 'var(--wire)';

            return (
              <g key={pct}>
                {/* Outer glow for active ticks */}
                {isActive && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={ledColor}
                    opacity="0.2"
                    animate={{ r: [4.5, 6.5, 4.5], opacity: [0.25, 0.1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                  />
                )}
                {/* Inner LED dot */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={ledColor}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.4, delay: pct * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              </g>
            );
          })}
        </svg>

        {/* Score display centered below arc */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--ink)', lineHeight: '1', letterSpacing: '-0.02em' }}>
            <AnimatedScore target={score} duration={1200} />
          </div>
        </div>
      </div>

      {/* Status label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div className="mono" style={{ fontSize: '10px', color: color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
          {scoreLabel(score)}
        </div>
        <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          [ {score}/100 ]
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ComplianceGauge;
