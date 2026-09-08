import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ReactLenis } from 'lenis/react';
import DataMesh from '../components/landing/DataMesh';
import {
  HeroSection,
  FeatureCardsSection,
  TheGapSection,
  HowItWorksSection,
  DifferentiatorSection,
  DataSovereigntySection,
  MetricsSection,
  FooterSection,
} from '../components/landing/Sections';

import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Landing = () => (
  <ReactLenis root>
    <div style={{ background: '#000', color: '#fff', overflowX: 'hidden', fontFamily: 'inherit' }}>
      <Helmet>
        <title>Compliance Auditor</title>
        <meta name="description" content="Multi-vendor network and cloud compliance auditing. Ingest raw configurations, correlate scattered findings, and sever attack paths in seconds." />
        <meta property="og:title" content="Compliance Auditor" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/favicon.svg" />
      </Helmet>

      {/* Fixed 3D LIDAR background */}
      <DataMesh />

      {/* CRT scanline overlay — subtle, not heavy */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,0.025) 0px,rgba(0,0,0,0.025) 1px,transparent 1px,transparent 2px)',
      }} />

      {/* Top Navigation */}
      <header style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={20} className="text-trace" />
          <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            COMPLIANCE<br />AUDITOR
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/login" style={{ color: 'var(--ink-dim)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-dim)'}>
            Sign In
          </Link>
          <Link to="/signup" className="bracket-btn" style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
            [ CREATE_ACCOUNT ]
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 20 }}>
        <HeroSection />
        <FeatureCardsSection />
        <TheGapSection />
        <HowItWorksSection />
        <DifferentiatorSection />
        <DataSovereigntySection />
        <MetricsSection />
        <FooterSection />
      </div>
    </div>
  </ReactLenis>
);

export default Landing;
