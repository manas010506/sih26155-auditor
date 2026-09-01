import React, { useState, useEffect } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { Menu, X } from 'lucide-react';
import { HelmetProvider } from 'react-helmet-async';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Findings from './pages/Findings';
import Landing from './pages/Landing';
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

import sampleReport from './sample_report.json';

// Title updater
const RouteTitle = ({ title }) => {
  useEffect(() => {
    document.title = `${title} | Compliance Auditor`;
  }, [title]);

  return null;
};

// Dashboard layout
const DashboardLayout = ({
  reportData,
  setReportData,
  score,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="flex w-full md-flex-col"
      style={{ minHeight: '100vh' }}
    >
      {/* Mobile Header */}
      <div
        className="md-show bg-panel border-b-wire flex items-center justify-between p-4"
        style={{
          height: '64px',
          width: '100%',
        }}
      >
        <div
          className="text-ink font-bold"
          style={{
            letterSpacing: '-0.02em',
            fontSize: '14px',
            lineHeight: '1.2',
          }}
        >
          COMPLIANCE
          <br />
          AUDITOR
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-ink"
        >
          {mobileMenuOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`flex-shrink-0 ${
          mobileMenuOpen
            ? 'md-sidebar'
            : 'md-hidden'
        }`}
        style={{
          width: '240px',
        }}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="h-full"
        >
          <Sidebar score={score} />
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex flex-col flex-1 md-content"
        style={{
          width: 'calc(100% - 240px)',
        }}
      >
        <Header device={reportData?.device} />

        <main
          className="flex-1 overflow-auto bg-substrate relative"
        >
          <Outlet
            context={{
              reportData,
              setReportData,
            }}
          />
        </main>
      </div>
    </div>
  );
};

function App() {
  const [reportData, setReportData] = useState(
    sampleReport
  );

  // Calculate compliance score
  const calculateScore = () => {
    if (!reportData?.findings) {
      return null;
    }

    const findings = reportData.findings;

    if (findings.length === 0) {
      return 100;
    }

    let penalty = 0;

    findings.forEach((finding) => {
      if (finding.pass_fail === 'fail') {
        if (finding.severity === 'critical') {
          penalty += 20;
        } else if (finding.severity === 'high') {
          penalty += 10;
        } else if (finding.severity === 'medium') {
          penalty += 5;
        } else if (finding.severity === 'low') {
          penalty += 2;
        }
      }
    });

    return Math.max(
      0,
      100 - penalty
    );
  };

  const score = calculateScore();

  return (
    <HelmetProvider>
      <SettingsProvider>
        <Router>
          <Toaster />

          <Routes>
            {/* Landing */}
            <Route
              path="/"
              element={<Landing />}
            />

            {/* Login */}
            <Route
              path="/login"
              element={
                <>
                  <RouteTitle title="Login" />
                  <Login />
                </>
              }
            />

            {/* Signup */}
            <Route
              path="/signup"
              element={
                <>
                  <RouteTitle title="Sign Up" />
                  <Signup />
                </>
              }
            />

            {/* Dashboard */}
            <Route
              path="/audit"
              element={
                <DashboardLayout
                  reportData={reportData}
                  setReportData={setReportData}
                  score={score}
                />
              }
            >
              {/* Default */}
              <Route
                index
                element={
                  <Navigate
                    to="/audit/upload"
                    replace
                  />
                }
              />

              {/* Upload */}
              <Route
                path="upload"
                element={
                  <>
                    <RouteTitle title="Upload Config" />
                    <Upload
                      onAuditComplete={setReportData}
                    />
                  </>
                }
              />

              {/* Findings */}
              <Route
                path="findings"
                element={
                  <>
                    <RouteTitle title="Findings" />
                    <Findings />
                  </>
                }
              />

              {/* Attack Graph */}
              <Route
                path="attack-paths"
                element={
                  <>
                    <RouteTitle title="Attack Paths" />
                    <AttackGraph
                      report={reportData}
                    />
                  </>
                }
              />

              {/* Compliance Report */}
              <Route
                path="report"
                element={
                  <>
                    <RouteTitle title="Compliance Report" />
                    <ReportView />
                  </>
                }
              />

              {/* Training */}
              <Route
                path="training"
                element={
                  <>
                    <RouteTitle title="Training" />
                    <Training />
                  </>
                }
              />
            </Route>

            {/* 404 */}
            <Route
              path="*"
              element={<NotFound />}
            />
          </Routes>

          <SettingsModal />
          <CommandPalette />
        </Router>
      </SettingsProvider>
    </HelmetProvider>
  );
}

export default App;