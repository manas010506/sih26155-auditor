import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { IconAlertTriangle, IconLayoutGrid } from '@tabler/icons-react';

const SEVERITY_COLORS = {
  critical: 'var(--severity-critical)',
  high:     'var(--severity-high)',
  medium:   'var(--severity-medium)',
  low:      'var(--severity-low)',
};

/* Animated count-up */
const CountUp = ({ end, duration = 1.0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const durationMs = duration * 1000;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return <span ref={ref}>{display}</span>;
};

/* Panel wrapper — glass-card */
const Panel = ({ title, icon: Icon, insight, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card"
    style={{
      padding: '24px',
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      {Icon && <Icon size={16} style={{ color: 'var(--trace)' }} />}
      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {title}
      </div>
    </div>
    {insight && (
      <div style={{ fontSize: '12px', color: 'var(--ink-dim)', marginBottom: '16px', lineHeight: '1.4' }}>
        {insight}
      </div>
    )}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  </motion.div>
);

/* Sleek Neon Line Graph for Severities matching reference image */
const SeverityLineGraph = ({ data }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // SVG coordinates mapping
  const width = 400;
  const height = 160;
  const paddingX = 30;
  const paddingY = 20;

  const maxVal = Math.max(...data.map(d => d.value), 4); // minimum ceiling to look good
  
  const points = data.map((d, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.value / maxVal) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  // A bright neon gradient matching the uploaded screenshot style
  const lineColor = '#4ade80'; // Neon green
  const lineGradientStart = '#2dd4bf'; // Cyan-ish start
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', marginTop: '16px' }}>
      
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Y-axis labels */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.1)', height: `${height - 2*paddingY}px`, marginTop: `${paddingY}px`, color: 'var(--ink-dim)', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', alignItems: 'flex-end', width: '32px' }}>
          <span>{maxVal}</span>
          <span>{Math.round(maxVal / 2)}</span>
          <span>0</span>
        </div>

        {/* The Graph */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={lineGradientStart} />
                <stop offset="100%" stopColor={lineColor} />
              </linearGradient>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area Fill */}
            <motion.path
              d={areaD}
              fill="url(#areaGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            />

            {/* Line Path */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />

            {/* Points */}
            {points.map((p, i) => {
              // Interpolate color for the circle stroke based on position (roughly)
              const pointColor = i < 2 ? lineGradientStart : lineColor;
              
              return (
                <motion.g
                  key={p.name}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1 + i * 0.15, type: 'spring' }}
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'crosshair' }}
                >
                  <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={hoveredPoint?.name === p.name ? "7" : "6"} fill="var(--panel-raised)" stroke={pointColor} strokeWidth="3" style={{ transition: 'all 0.2s' }} />
                </motion.g>
              );
            })}
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
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100}%`,
                  transform: 'translate(-50%, -120%)',
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
                }}
              >
                <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)' }}>{hoveredPoint.name}</span>
                <span className="mono" style={{ fontSize: '14px', fontWeight: 'bold', color: hoveredPoint.fill, marginTop: '2px' }}>{hoveredPoint.value}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* X-axis labels */}
      <div style={{ display: 'flex', position: 'relative', marginLeft: '32px', marginTop: '12px' }}>
        {points.map((p, i) => (
           <span key={p.name} className="mono" style={{ position: 'absolute', left: `${(p.x / width) * 100}%`, transform: 'translateX(-50%)', fontSize: '10px', color: 'var(--ink-dim)' }}>
             {p.name.substring(0,3)}
           </span>
        ))}
      </div>

    </div>
  );
};

/* Sleek List Graph for Affected Resources */
const ResourceListGraph = ({ categoryData }) => {
  const maxVal = Math.max(...categoryData.map(d => d[1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', paddingRight: '8px' }}>
      {categoryData.map(([name, value], i) => {
        const widthPct = (value / maxVal) * 100;
        const color = value > 10 ? 'var(--severity-critical)' : value > 4 ? 'var(--severity-high)' : 'var(--severity-medium)';
        
        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: i < categoryData.length - 1 ? '1px solid var(--wire)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div className="mono" style={{ fontSize: '12px', color: 'var(--ink)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {name}
              </div>
              <div className="mono" style={{ fontSize: '12px', color: color, fontWeight: 600, flexShrink: 0 }}>
                {value} <span style={{ color: 'var(--ink-dim)', fontWeight: 400, fontSize: '10px' }}>FINDINGS</span>
              </div>
            </div>
            
            {/* Mini bar graph under the text */}
            <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--panel-raised)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
                style={{ height: '100%', backgroundColor: color }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const SeverityDashboard = ({ findings }) => {
  const { severityData, categoryData, criticalCount } = useMemo(() => {
    const sevMap = { critical: 0, high: 0, medium: 0, low: 0 };
    const catMap = {};

    findings.forEach(f => {
      const sev = f.severity?.toLowerCase();
      if (sev in sevMap) sevMap[sev]++;
      const cat = f.resource_id || 'Uncategorized';
      if (!catMap[cat]) catMap[cat] = 0;
      catMap[cat]++;
    });

    const severityData = [
      { name: 'CRITICAL', value: sevMap.critical, fill: SEVERITY_COLORS.critical },
      { name: 'HIGH',     value: sevMap.high,     fill: SEVERITY_COLORS.high     },
      { name: 'MEDIUM',   value: sevMap.medium,   fill: SEVERITY_COLORS.medium   },
      { name: 'LOW',      value: sevMap.low,      fill: SEVERITY_COLORS.low      },
    ];

    const categoryData = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    return { severityData, categoryData, criticalCount: sevMap.critical };
  }, [findings]);

  if (!findings?.length) return null;

  const severityInsight = criticalCount > 0
    ? `${criticalCount} critical finding${criticalCount !== 1 ? 's' : ''} need immediate attention`
    : 'No critical findings detected';

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      padding: '24px 32px',
      borderBottom: '1px solid var(--wire)',
      flexWrap: 'wrap',
    }}>
      {/* Custom SVG horizontal bar chart panel */}
      <Panel title="Severity Breakdown" icon={IconAlertTriangle} insight={severityInsight}>
        <SeverityLineGraph data={severityData} />
      </Panel>

      {/* Sleek List Graph panel */}
      <Panel title="Affected Resources" icon={IconLayoutGrid} insight={`${categoryData.length} resource${categoryData.length !== 1 ? 's' : ''} with active findings`}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <ResourceListGraph categoryData={categoryData} />
        </div>
      </Panel>
    </div>
  );
};

export default SeverityDashboard;
