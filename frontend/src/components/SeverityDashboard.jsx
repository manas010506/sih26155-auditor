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

/* Horizontal bar row — hand-built, not Recharts, for the category breakdown.
   Much cleaner than a Pie at this size. */
const CategoryRow = ({ name, value, max, index }) => {
  const CATEGORY_COLORS = ['var(--trace)', 'var(--severity-low)', 'var(--ink-dim)', 'var(--wire)'];
  const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}
    >
      {/* Category name */}
      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-dim)', width: '120px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    style={{
      backgroundColor: 'var(--panel)',
      border: '1px solid var(--wire)',
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
      if (!catMap[f.category]) catMap[f.category] = 0;
      catMap[f.category]++;
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
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '16px 24px',
      borderBottom: '1px solid var(--wire)',
      backgroundColor: 'var(--substrate)',
      flexWrap: 'wrap',
    }}>
      {/* Findings by Severity — Recharts bar chart, custom styled */}
      <Panel title="Findings by Severity">
        <div style={{ height: '140px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }} barCategoryGap="30%">
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--ink-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono', letterSpacing: '0.04em' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--ink-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,85,99,0.15)' }} />
              <Bar dataKey="value" radius={[1, 1, 0, 0]}>
                {severityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Findings by Category — hand-built horizontal bars */}
      <Panel title="Findings by Category">
        <div>
          {categoryData.map(([name, value], i) => (
            <CategoryRow key={name} name={name} value={value} max={maxCategory} index={i} />
          ))}
        </div>
      </Panel>
    </div>
  );
};

export default SeverityDashboard;
