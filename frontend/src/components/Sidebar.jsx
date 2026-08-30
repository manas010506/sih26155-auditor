import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconUpload,
  IconTable,
  IconRoute,
  IconFileText,
} from '@tabler/icons-react';
import ComplianceGauge from './ComplianceGauge';

const NAV_ITEMS = [
  { id: '01', path: '/audit/upload',       label: 'UPLOAD',       Icon: IconUpload   },
  { id: '02', path: '/audit/findings',     label: 'FINDINGS',     Icon: IconTable    },
  { id: '03', path: '/audit/attack-paths', label: 'ATTACK PATHS', Icon: IconRoute    },
  { id: '04', path: '/audit/report',       label: 'REPORT',       Icon: IconFileText },
];

/* Sliding accent bar — uses Framer layoutId so it animates between items */
const ActiveBar = () => (
  <motion.div
    layoutId="sidebar-active-bar"
    style={{
      position: 'absolute',
      left: 0,
      top: '6px',
      bottom: '6px',
      width: '2px',
      backgroundColor: 'var(--trace)',
      borderRadius: '0 1px 1px 0',
    }}
    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
  />
);

const Sidebar = ({ score }) => {
  const location = useLocation();

  return (
    <motion.div
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: '220px',
        height: '100vh',
        backgroundColor: 'var(--panel)',
        borderRight: '1px solid var(--wire)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Product identity */}
      <div style={{
        padding: '18px 20px 16px',
        borderBottom: '1px solid var(--wire)',
      }}>
        <div className="label" style={{ marginBottom: '4px' }}>SIH-26155</div>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--ink)',
          fontFamily: 'IBM Plex Sans, sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
        }}>
          COMPLIANCE<br />AUDITOR
        </div>
      </div>

      {/* Nav with connecting line */}
      <nav style={{ flex: 1, padding: '16px 0', position: 'relative' }}>

        {/* Vertical connecting line behind the step numbers */}
        <div style={{
          position: 'absolute',
          left: '30px',          /* centres on the number column */
          top: '28px',
          bottom: '28px',
          width: '1px',
          backgroundColor: 'var(--wire)',
          zIndex: 0,
        }} />

        {NAV_ITEMS.map((item, i) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <NavLink to={item.path} style={{ display: 'block', textDecoration: 'none' }}>
                {({ isActive: navActive }) => {
                  const active = navActive || isActive;
                  return (
                    <motion.div
                      whileHover={{ backgroundColor: 'var(--panel-raised)' }}
                      transition={{ duration: 0.12 }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 16px',
                        backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
                      }}
                    >
                      {active && <ActiveBar />}

                      {/* Step number + filled dot on active — overlays the connecting line */}
                      <div style={{
                        width: '22px',
                        height: '22px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2,
                        backgroundColor: active ? 'var(--trace)' : 'var(--panel)',
                        border: `1px solid ${active ? 'var(--trace)' : 'var(--wire)'}`,
                        borderRadius: '50%',
                        transition: 'background-color 0.15s, border-color 0.15s',
                      }}>
                        <span className="mono" style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: active ? 'var(--substrate)' : 'var(--ink-dim)',
                          letterSpacing: '0',
                          lineHeight: 1,
                          transition: 'color 0.15s',
                        }}>
                          {item.id}
                        </span>
                      </div>

                      {/* Tabler icon */}
                      <item.Icon
                        size={15}
                        stroke={1.5}
                        style={{
                          color: active ? 'var(--trace)' : 'var(--ink-dim)',
                          flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                      />

                      {/* Label */}
                      <span className="mono" style={{
                        fontSize: '11px',
                        fontWeight: active ? 600 : 400,
                        color: active ? 'var(--ink)' : 'var(--ink-dim)',
                        letterSpacing: '0.06em',
                        transition: 'color 0.15s',
                      }}>
                        {item.label}
                      </span>
                    </motion.div>
                  );
                }}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Compliance gauge pinned at bottom */}
      {score !== null && score !== undefined && (
        <div style={{
          borderTop: '1px solid var(--wire)',
          padding: '16px',
        }}>
          <div className="label" style={{ textAlign: 'center', marginBottom: '10px' }}>
            Compliance Score
          </div>
          <ComplianceGauge score={score} />
        </div>
      )}
    </motion.div>
  );
};

export default Sidebar;
