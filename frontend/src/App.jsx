import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import Sidebar from './components/Sidebar';
import Header from './components/Header'; // to be removed
import TopBar from './components/TopBar';
import Findings from './pages/Findings';
import Upload from './pages/Upload';
import ReportView from './pages/ReportView';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import SettingsModal from './components/SettingsModal';
import CommandPalette from './components/CommandPalette';
import { SettingsProvider } from './context/SettingsContext';
import { Toaster } from 'sonner';
import AttackGraph from './components/AttackGraph';
import Training from './pages/Training';


// Title updater (for dashboard routes without Helmet)
const RouteTitle = ({ title }) => {
  useEffect(() => {
    document.title = `${title} | Compliance Auditor`;
  }, [title]);
  return null;
};

const DashboardLayout = ({ reportData, setReportData, score }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        style={{ width: isCollapsed ? '72px' : '240px', transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        onClick={() => setMobileMenuOpen(false)} // close on nav
      >
        <div onClick={e => e.stopPropagation()} className="h-full">
          <Sidebar score={score} breakdown={reportData?.score_breakdown} findings={reportData?.findings} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md-content" style={{ width: `calc(100% - ${isCollapsed ? '72px' : '240px'})`, transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <TopBar device={reportData?.device} source={reportData?.source} onSettingsClick={() => setSettingsOpen(true)} />
        
        <main className="flex-1 overflow-auto bg-grid relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={useLocation().pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%' }}
            >
              <Outlet context={{ reportData, setReportData }} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

import sampleReport from './sample_report.json';

function App() {
  const [reportData, setReportData] = useState(sampleReport);

  // Data ingestion happens via Upload.jsx, which sets the reportData.

  const score = reportData?.compliance_score ?? null;

  return (
    <HelmetProvider>
      <SettingsProvider>
        <Router>
          <Toaster theme="dark" toastOptions={{ style: { backgroundColor: 'var(--panel-raised)', border: '1px solid var(--trace)', color: 'var(--trace)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' } }} />
          <CommandPalette />
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<><RouteTitle title="Login" /><Login /></>} />
            <Route path="/signup" element={<><RouteTitle title="Create Account" /><Signup /></>} />

            {/* Dashboard Layout */}
            <Route path="/audit" element={<DashboardLayout reportData={reportData} setReportData={setReportData} score={score} />}>
              <Route index element={<Navigate to="/audit/upload" replace />} />
              <Route path="upload" element={<><RouteTitle title="Upload Config" /><Upload /></>} />
              <Route path="findings" element={<><RouteTitle title="Findings" /><Findings /></>} />
              <Route path="attack-paths" element={<><RouteTitle title="Attack Paths" /><AttackGraph /></>} />
              <Route path="report" element={<><RouteTitle title="Compliance Report" /><ReportView /></>} />
              <Route path="training" element={<><RouteTitle title="Training" /><Training /></>} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<><RouteTitle title="Not Found" /><NotFound /></>} />
          </Routes>
        </Router>
      </SettingsProvider>
    </HelmetProvider>
  );
}

export default App;
