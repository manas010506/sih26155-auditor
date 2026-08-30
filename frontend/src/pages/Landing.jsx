import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ReactLenis } from 'lenis/react';
import DataMesh from '../components/landing/DataMesh';
import {
  HeroSection,
  TheGapSection,
  HowItWorksSection,
  DifferentiatorSection,
  DataSovereigntySection,
  MetricsSection,
  FooterSection,
} from '../components/landing/Sections';

const Landing = () => (
  <ReactLenis root>
    <div style={{ background: '#000', color: '#fff', overflowX: 'hidden', fontFamily: 'inherit' }}>
      <Helmet>
        <title>Compliance Auditor | System Auditor Core v2.0</title>
        <meta name="description" content="Multi-vendor network and cloud compliance auditing. Ingest raw configurations, correlate scattered findings, and sever attack paths in seconds." />
        <meta property="og:title" content="Compliance Auditor | System Auditor Core v2.0" />
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

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 20 }}>
        <HeroSection />
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
