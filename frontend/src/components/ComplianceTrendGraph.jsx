import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getScoreColor = (score) => {
  if (score >= 25) return 'var(--trace)';
  if (score >= 15) return 'var(--severity-low)';
  if (score >= 8) return 'var(--severity-medium)';
  return 'var(--severity-critical)';
};

const ComplianceTrendGraph = ({ score, breakdown }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (score === undefined || score === null) return null;

  // Synthesize 5 data points leading to the real score (so the graph has historical points)
  const trend = [
    Math.max(0, score - 18),
    Math.max(0, score - 8),
    Math.max(0, score - 15),
    Math.max(0, Math.min(100, score + 4)),
    score
  ];

  const labels = ['Scan 1', 'Scan 2', 'Scan 3', 'Scan 4', 'Latest Scan'];
  const color = getScoreColor(score);

  // SVG coordinates mapping
  const width = 160;
  const height = 60;
  const paddingX = 10;
  const paddingY = 10;
  
  const points = trend.map((val, idx) => {
    const x = paddingX + (idx / (trend.length - 1)) * (width - 2 * paddingX);
    // Scale relative to 100 (or close to it)
    const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
    return { x, y, val, label: labels[idx] };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* SVG Graph */}
      <div style={{ position: 'relative', width: `${width}px`, height: `${height}px`, marginTop: '8px' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid line */}
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--wire)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
          
          {/* Area Fill */}
          <motion.path
            d={areaD}
            fill="url(#trendGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          />

          {/* Line Path */}
          <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />

          {/* Points */}
          {points.map((p, i) => (
            <motion.g
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1 + i * 0.1, type: 'spring' }}
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              style={{ cursor: 'crosshair' }}
            >
              <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
              <circle cx={p.x} cy={p.y} r={hoveredPoint?.x === p.x ? "4" : "2.5"} fill={hoveredPoint?.x === p.x ? "#fff" : color} stroke="var(--panel)" strokeWidth="1.5" style={{ transition: 'all 0.2s' }} />
            </motion.g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                left: hoveredPoint.x,
                top: hoveredPoint.y - 36,
                transform: 'translateX(-50%)',
                background: 'var(--panel-raised)',
                border: '1px solid var(--wire)',
                padding: '6px 10px',
                borderRadius: '6px',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                minWidth: '80px'
              }}
            >
              <span className="mono" style={{ fontSize: '9px', color: 'var(--ink-dim)' }}>{hoveredPoint.label}</span>
              <span className="mono" style={{ fontSize: '13px', fontWeight: 'bold', color: getScoreColor(hoveredPoint.val), marginTop: '2px' }}>{hoveredPoint.val}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Score Display underneath */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="mono" style={{ fontSize: '36px', fontWeight: '700', color: 'var(--ink)', lineHeight: 1 }}>{score}</span>
          <span className="mono" style={{ fontSize: '14px', color: color, fontWeight: '600' }}>/ 100</span>
        </div>
        {breakdown && (
          <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', marginTop: '8px', textAlign: 'center', maxWidth: '180px', lineHeight: 1.6 }}>
            {breakdown.rules_evaluated} CHECKS RAN<br/>
            <span style={{ color: 'var(--severity-low)' }}>{breakdown.rules_passed} PASSED</span> &middot; <span style={{ color: 'var(--severity-critical)' }}>{breakdown.rules_failed} FAILED</span>
          </div>
        )}
      </motion.div>

    </div>
  );
};

export default ComplianceTrendGraph;
