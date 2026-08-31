import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Findings from './pages/Findings';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import ReportView from './pages/ReportView';
import AttackGraph from './components/AttackGraph';

// Title updater (for dashboard routes without Helmet)
const RouteTitle = ({ title }) => {
  useEffect(() => {
    document.title = `${title} | Compliance Auditor`;
  }, [title]);
  return null;
};

// Placeholder Pages
// Placeholder Pages

// AttackPaths not required in this brief
const AttackPathsPlaceholder = () => (
  <div className="flex items-center justify-center h-full w-full p-6">
    <RouteTitle title="Attack Paths" />
    <div className="text-ink-dim mono text-center">Attack Path Graph placeholder...</div>
  </div>
);

const NotFound = () => (
  <div className="flex items-center justify-center h-full w-full p-6">
    <RouteTitle title="Not Found" />
    <div className="bg-panel border-wire p-6 radius-md text-center max-w-md">
      <h2 className="text-ink mb-2">404 - Not Found</h2>
      <p className="text-ink-dim text-sm">The route you are looking for does not exist in this console.</p>
    </div>
  </div>
);

const DashboardLayout = ({ reportData, score }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex w-full md-flex-col" style={{ minHeight: '100vh' }}>
      {/* Mobile Header (Hamburger) */}
      <div className="md-show bg-panel border-b-wire flex items-center justify-between p-4" style={{ height: '64px', width: '100%' }}>
        <div className="text-ink font-bold" style={{ letterSpacing: '-0.02em', fontSize: '14px', lineHeight: '1.2' }}>
          COMPLIANCE<br/>AUDITOR
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-ink">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className={`flex-shrink-0 ${mobileMenuOpen ? 'md-sidebar' : 'md-hidden'}`} 
        style={{ width: '240px' }}
        onClick={() => setMobileMenuOpen(false)} // close on nav
      >
        <div onClick={e => e.stopPropagation()} className="h-full">
          <Sidebar score={score} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md-content" style={{ width: 'calc(100% - 240px)' }}>
        <Header device={reportData?.device} />
        
        <main className="flex-1 overflow-auto bg-substrate relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    import('./sample_report.json')
      .then(module => {
        setReportData(module.default);
      })
      .catch(console.error);
  }, []);

  const calculateScore = () => {
    if (!reportData?.findings) return null;
    const findings = reportData.findings;
    if (findings.length === 0) return 100;
    
    let penalty = 0;
    findings.forEach(f => {
      if (f.pass_fail === 'fail') {
        if (f.severity === 'critical') penalty += 20;
        else if (f.severity === 'high') penalty += 10;
        else if (f.severity === 'medium') penalty += 5;
        else if (f.severity === 'low') penalty += 2;
      }
    });
    return Math.max(0, 100 - penalty);
  };

  const score = calculateScore();

  return (
    <HelmetProvider>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />

          {/* Dashboard Layout */}
          <Route path="/audit" element={<DashboardLayout reportData={reportData} score={score} />}>
            <Route index element={<Navigate to="/audit/upload" replace />} />

            <Route
              path="upload"
              element={<Upload onAuditComplete={setReportData} />}
            />

            <Route path="findings" element={<Findings />} />

            <Route
              path="attack-paths"
              element={<AttackGraph report={reportData} />}
            />

            <Route path="report" element={<ReportView />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
