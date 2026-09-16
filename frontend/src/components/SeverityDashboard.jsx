import React, { useMemo, useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { IconAlertTriangle, IconLayoutGrid } from '@tabler/icons-react';

const SEVERITY_COLORS = {
  critical: 'var(--severity-critical)',
  high: 'var(--severity-high)',
  medium: 'var(--severity-medium)',
  low: 'var(--severity-low)',
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

/* Severity counts as bars. These are categories, not a series:
   a line between them would imply a trend that does not exist. */
const SeverityBarGraph = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 40px', alignItems: 'center', gap: '12px' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.06em' }}>
            {d.name}
          </span>
          <div style={{ height: '10px', backgroundColor: 'var(--panel-raised)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / maxVal) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
              style={{ height: '100%', backgroundColor: d.fill, borderRadius: '3px' }}
            />
          </div>
          <span className="mono" style={{ fontSize: '13px', fontWeight: 600, textAlign: 'right', color: d.value ? d.fill : 'var(--ink-dim)' }}>
            <CountUp end={d.value} />
          </span>
        </div>
      ))}
      <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-dim)', textAlign: 'right' }}>
        {total} finding{total !== 1 ? 's' : ''}
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

/* Pass/fail across the checks that were evaluated. Sits at the bottom of
   the severity panel and puts the pass/fail result the problem statement
   asks for on the first screen. */
const CheckSummary = ({ breakdown }) => {
  if (!breakdown) return null;
  const passed = breakdown.rules_passed ?? 0;
  const failed = breakdown.rules_failed ?? 0;
  const evaluated = breakdown.rules_evaluated ?? passed + failed;
  const pct = evaluated ? (passed / evaluated) * 100 : 0;

  return (
    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--wire)' }}>
        <div className="mono" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '12px', fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '0.06em', marginBottom: '8px' }}>
          <span style={{whiteSpace: 'nowrap'}}>
            CHECKS · {breakdown.partial ? `${evaluated} OF ${breakdown.controls_total} EVALUATED` : `${evaluated} EVALUATED`}
          </span>
          <span>
            <span style={{ whiteSpace: 'nowrap' }}>{passed} PASSED</span>
            {' · '}
            <span style={{ whiteSpace: 'nowrap' }}>{failed} FAILED</span>
          </span>
        </div>
        <div style={{ display: 'flex', height: '8px', borderRadius: '3px', overflow: 'hidden', backgroundColor: 'var(--panel-raised)' }}>
          <div style={{ width: `${pct}%`, backgroundColor: 'var(--trace)' }} />
          <div style={{ flex: 1, backgroundColor: 'var(--severity-critical)', opacity: 0.8 }} />
        </div>
      </div>
    </div>
  );
};

const SeverityDashboard = ({ findings, breakdown }) => {
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
      { name: 'HIGH', value: sevMap.high, fill: SEVERITY_COLORS.high },
      { name: 'MEDIUM', value: sevMap.medium, fill: SEVERITY_COLORS.medium },
      { name: 'LOW', value: sevMap.low, fill: SEVERITY_COLORS.low },
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
        <SeverityBarGraph data={severityData} />
        <CheckSummary breakdown={breakdown} />
      </Panel>

      {/* Sleek List Graph panel */}
      <Panel title="Affected Resources" icon={IconLayoutGrid} insight={`${categoryData.length} resource${categoryData.length !== 1 ? 's' : ''} with active findings`}>
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '240px' }}>
          <ResourceListGraph categoryData={categoryData} />
        </div>
      </Panel>
    </div>
  );
};

export default SeverityDashboard;
