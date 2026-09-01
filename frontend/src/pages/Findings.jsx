import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import FindingsTable from '../components/FindingsTable';
import SeverityDashboard from '../components/SeverityDashboard';

const Findings = () => {
  const { reportData } = useOutletContext();
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Findings | Compliance Auditor";
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6">
        <div className="bg-panel border-wire p-6 radius-md text-center max-w-md w-full">
          <h3 className="text-severity-critical mb-2">Error Loading Findings</h3>
          <p className="text-ink-dim text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--substrate)' }}>
        <div className="corner-marks" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px', border: '1px dashed var(--wire)', backgroundColor: 'var(--panel)', maxWidth: '400px' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" style={{ color: 'var(--ink-dim)' }}>
            {/* Dashed Outline box */}
            <rect x="8" y="8" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
            {/* Cross/Cancel inner shape */}
            <path d="M 18 18 l 12 12 M 30 18 l -12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            {/* Tick marks */}
            <path d="M 8 24 h -4 M 40 24 h 4 M 24 8 v -4 M 24 40 v 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="mono" style={{ fontSize: '14px', color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>No Data Available</div>
          <div style={{ fontSize: '13px', color: 'var(--ink-dim)', textAlign: 'center', lineHeight: '1.5' }}>
            There are no findings to display because an audit has not been run. Upload a configuration file to begin.
          </div>
          <Link to="/audit/upload" style={{
            marginTop: '8px',
            backgroundColor: 'transparent',
            border: '1px solid var(--wire)',
            color: 'var(--ink)',
            padding: '8px 20px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            transition: 'border-color 0.2s, color 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--trace)'; e.currentTarget.style.color = 'var(--trace)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--wire)'; e.currentTarget.style.color = 'var(--ink)'; }}
          >
            Go to Upload
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <SeverityDashboard findings={reportData.findings} />
      <div className="flex-1 overflow-hidden">
        <FindingsTable findings={reportData.findings} />
      </div>
    </div>
  );
};

export default Findings;
