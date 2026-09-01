import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#E5484D',
  high:     '#F0883E',
  medium:   '#E8C547',
  low:      '#7C8CA6',
};

/* Custom tooltip — no box-shadow, matches design system */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--panel-raised)',
      border: '1px solid var(--wire)',
      padding: '8px 12px',
    }}>
      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>
        {payload[0].value} finding{payload[0].value !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

/* Custom shape for Recharts Bar to include LED dot and styled bar */
const CustomBarShape = (props) => {
  const { fill, x, y, width, height, value } = props;
  if (height === 0 || isNaN(height)) return null;

  return (
    <g>
      {/* Reduced opacity fill */}
      <rect x={x} y={y} width={width} height={height} fill={fill} opacity={0.15} />
      {/* Solid border */}
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={fill} strokeWidth={1} />
      
      {/* LED Dot above the bar (only if there's a value) */}
      {value > 0 && (
        <g transform={`translate(${x + width / 2}, ${y - 12})`}>
          {/* Glow */}
          <circle cx="0" cy="0" r="5" fill={fill} opacity="0.25" />
          {/* Solid dot */}
          <circle cx="0" cy="0" r="3" fill={fill} />
        </g>
      )}
    </g>
  );
};

/* Horizontal bar row — hand-built, not Recharts, for the category breakdown. */
const CategoryRow = ({ name, value, max, index }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const color = isHovered ? 'var(--trace)' : 'var(--wire)';
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={name} // Native tooltip for full text
      style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'default' }}
    >
      {/* Category name */}
      <div className="mono" style={{ fontSize: '11px', color: isHovered ? 'var(--trace)' : 'var(--ink-dim)', width: '120px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
        {name}
      </div>
      {/* Bar track */}
      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--panel-raised)', position: 'relative' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            backgroundColor: color,
            transition: 'background-color 0.2s',
          }}
        />
      </div>
      {/* Count */}
      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink)', width: '20px', textAlign: 'right', flexShrink: 0 }}>
        {value}
      </div>
    </motion.div>
  );
};

/* Panel wrapper — consistent card style */
const Panel = ({ title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="bezel-panel corner-marks"
    style={{
      padding: '20px',
      flex: 1,
      minWidth: 0,
    }}
  >
    <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '18px' }}>
      {title}
    </div>
    {children}
  </motion.div>
);

const SeverityDashboard = ({ findings }) => {
  const { severityData, categoryData, maxCategory } = useMemo(() => {
    const sevMap = { critical: 0, high: 0, medium: 0, low: 0 };
    const catMap = {};

    findings.forEach(f => {
      const sev = f.severity?.toLowerCase();
      if (sev in sevMap) sevMap[sev]++;

      // Group by resource type (e.g. "vty-0-4")
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

    const categoryData = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1]);

    const maxCategory = Math.max(...categoryData.map(([, v]) => v), 1);

    return { severityData, categoryData, maxCategory };
  }, [findings]);

  if (!findings?.length) return null;

  return (
    <div className="bg-grid" style={{
      display: 'flex',
      gap: '12px',
      padding: '16px 24px',
      borderBottom: '1px solid var(--wire)',
      flexWrap: 'wrap',
    }}>
      {/* Findings by Severity — Recharts bar chart, custom styled */}
      <Panel title="Findings by Severity">
        <div style={{ height: '140px', marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={[{ name: 'Severity', ...severityData.reduce((acc, curr) => ({...acc, [curr.name]: curr.value}), {}) }]} 
              margin={{ top: 16, right: 0, left: -28, bottom: 0 }} 
              barCategoryGap="30%"
            >
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--ink-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}
                axisLine={{ stroke: 'var(--wire)' }}
                tickLine={false}
                dy={6}
                hide={true} /* We can hide it since there is only one category, or show custom tick */
              />
              <YAxis
                tick={{ fill: 'var(--ink-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                domain={[0, 'dataMax']}
                tickCount={4}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--panel-raised)', opacity: 0.4 }} />
              
              {severityData.map((entry, index) => (
                <Bar 
                  key={entry.name}
                  dataKey={entry.name} 
                  shape={<CustomBarShape fill={entry.fill} />}
                  isAnimationActive={true}
                  animationBegin={index * 150}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Findings by Resource — hand-built horizontal bars */}
      <Panel title="Findings by Resource">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {categoryData.map(([name, value], i) => (
            <CategoryRow key={name} name={name} value={value} max={maxCategory} index={i} />
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default SeverityDashboard;
