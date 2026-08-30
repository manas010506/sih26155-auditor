import React, { useState, useEffect } from 'react';
import FindingsTable from '../components/FindingsTable';
import SeverityDashboard from '../components/SeverityDashboard';

const Findings = () => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Findings | Compliance Auditor";
    
    // In the future, this will be a fetch('/api/audit')
    import('../sample_report.json')
      .then(module => {
        setReportData(module.default);
      })
      .catch(err => {
        console.error("Failed to load report data", err);
        setError("Failed to load report data. Please ensure the backend is reachable.");
      });
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
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-ink-dim mono uppercase" style={{ letterSpacing: '0.05em' }}>
          Parsing configuration...
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
