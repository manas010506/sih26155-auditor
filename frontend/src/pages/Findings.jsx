import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import FindingsTable from '../components/FindingsTable';
import SeverityDashboard from '../components/SeverityDashboard';
import EmptyStateCard from '../components/EmptyStateCard';
import { IconSearch } from '@tabler/icons-react';

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
    const FindingsSVG = (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="findingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--trace)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--trace)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--trace)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="20%" y="25%" width="60%" height="6" rx="3" fill="var(--wire)" opacity="0.4" />
        <rect x="20%" y="35%" width="45%" height="6" rx="3" fill="var(--wire)" opacity="0.2" />
        <rect x="20%" y="45%" width="55%" height="6" rx="3" fill="var(--wire)" opacity="0.2" />
        <rect x="20%" y="65%" width="60%" height="6" rx="3" fill="var(--wire)" opacity="0.4" />
        <rect x="20%" y="75%" width="40%" height="6" rx="3" fill="var(--wire)" opacity="0.2" />
        <path d="M -50 40 Q 250 80 550 40" fill="none" stroke="url(#findingsGrad)" strokeWidth="2" />
      </svg>
    );

    return (
      <EmptyStateCard
        title="No Audit Findings"
        description="Upload a configuration file to execute the auditing engine and uncover security misconfigurations."
        icon={IconSearch}
        svgLayer={FindingsSVG}
      />
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
