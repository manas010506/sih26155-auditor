import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

/* Custom lightweight CountUp */
const CountUp = ({ end, duration = 1.4 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(end.toString());
      return;
    }
    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease out
      const value = Math.round(eased * end);
      setDisplay(value.toString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return <span ref={ref}>{display}</span>;
};

/* Score bands calibrated against the real penalty engine */
const scoreLabel = (s) => {
  if (s >= 90) return 'GOOD';
  if (s >= 70) return 'FAIR';
  if (s >= 40) return 'POOR';
  return 'CRITICAL';
};

const scoreColor = (s) => {
  if (s >= 90) return 'var(--trace)';
  if (s >= 70) return 'var(--severity-low)';
  if (s >= 40) return 'var(--severity-medium)';
  return 'var(--severity-critical)';
};

const ComplianceGauge = ({ score, breakdown, compact = false }) => {
  if (score === undefined || score === null) return null;

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
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Inner highlight arc for physical gauge lighting effect */}
          <motion.path
            d="M 11 59.5 A 39.5 39.5 0 0 1 109 59.5"
            transform="translate(0, -1)"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.3"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Additional bottom shadow for depth */}
          <motion.path
            d="M 10.5 60.5 A 40.5 40.5 0 0 1 109.5 60.5"
            transform="translate(0, 1)"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* LED tick marks around the arc — 5 ticks at 0%, 25%, 50%, 75%, 100% */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const angle = (pct / 100) * Math.PI; // 0 to π radians
            const x = 60 + 50 * Math.cos(angle);
            const y = 60 + 50 * Math.sin(angle);

            const isActive = pct <= score;
            const ledColor = isActive
              ? score >= 90
                ? 'var(--trace)'
                : score >= 70
                ? 'var(--severity-low)'
                : score >= 40
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
                    animate={{ scale: [0.9, 1.3, 0.9], opacity: [0.25, 0.1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                    style={{ transformOrigin: `${x}px ${y}px` }}
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
            <CountUp end={score} duration={0.8} />
          </div>
        </div>
      </div>

      {/* Status label */}
      {!compact && (
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
            [ <CountUp end={score} duration={0.8} />/100 ]
          </div>
          {breakdown && (
            <div className="mono" style={{ fontSize: '9px', color: 'var(--ink-dim)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {breakdown.rules_evaluated} checks &middot; {breakdown.rules_passed} passed &middot; {breakdown.rules_failed} failed
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ComplianceGauge;
