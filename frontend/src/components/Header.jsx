import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* Pulsing LIVE dot — matches the LED motif used in SeverityLED and ComplianceGauge */
const LiveDot = () => (
  <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
    {/* Outer glow ring — animates like a real status LED */}
    <motion.div
      animate={{ scale: [1, 1.9, 1], opacity: [0.4, 0, 0.4] }}
      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        backgroundColor: 'var(--trace)',
        opacity: 0.35,
      }}
    />
    {/* Inner solid dot */}
    <div style={{
      position: 'absolute',
      inset: '1px',
      borderRadius: '50%',
      backgroundColor: 'var(--trace)',
    }} />
  </div>
);

/* Thin vertical rule between fields */
const Divider = () => (
  <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--wire)', flexShrink: 0 }} />
);

/* One labelled field */
const Field = ({ label, value, mono = true }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
  >
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-dim)', marginBottom: '2px' }}>
      {label}
    </div>
    <div
      className={mono ? 'mono' : ''}
      style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, letterSpacing: mono ? '0.02em' : undefined }}
    >
      {value}
    </div>
  </motion.div>
);

const Header = ({ device }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (device) setVisible(true);
  }, [device]);

  if (!device) {
    return (
      <header style={{
        height: '56px',
        borderBottom: '1px solid var(--wire)',
        backgroundColor: 'var(--panel)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '12px',
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--wire)' }} />
        <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Awaiting device data
        </span>
      </header>
    );
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            height: '56px',
            borderBottom: '1px solid var(--wire)',
            backgroundColor: 'var(--panel)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: '20px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* LIVE indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <LiveDot />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--trace)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              LIVE
            </span>
          </div>

          <Divider />

          <Field label="Device" value={device.name} />

          {device.hardware_model && (
            <>
              <Divider />
              <Field label="Model" value={device.hardware_model} />
            </>
          )}

          {device.serial_number && (
            <>
              <div className="hide-on-mobile" style={{ display: 'contents' }}>
                <Divider />
                <Field label="S/N" value={device.serial_number} />
              </div>
            </>
          )}

          <Divider />
          <Field label="Source" value={device.source_type} />

          {device.filename && (
            <>
              <div className="hide-on-mobile" style={{ display: 'contents' }}>
                <Divider />
                <Field label="File" value={device.filename} />
              </div>
            </>
          )}
        </motion.header>
      )}
    </AnimatePresence>
  );
};

export default Header;
