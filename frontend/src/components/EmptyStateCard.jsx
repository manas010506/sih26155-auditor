import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const EmptyStateCard = ({ title, description, icon: Icon, svgLayer, actionText = "Go to Upload", actionPath = "/audit/upload" }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: 'transparent' }}>
      <motion.div
        key="empty-state"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{
          padding: '56px 48px',
          textAlign: 'center',
          maxWidth: '520px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* SVG Background Layer for depth */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.7, zIndex: 0 }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }} />
          {svgLayer}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(63, 169, 160, 0.05) 0%, transparent 70%)',
            zIndex: -1
          }} />
        </div>
        
        {/* Content Layer */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--trace-dim)', 
            border: '1px solid rgba(63,169,160,0.3)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px',
            boxShadow: '0 0 32px rgba(63, 169, 160, 0.15)' 
          }}>
            <Icon size={36} style={{ color: 'var(--trace)' }} stroke={1.5} />
          </div>
          
          <h3 className="heading-lg" style={{ marginBottom: '12px' }}>{title}</h3>
          
          <p className="text-ink-dim" style={{ fontSize: '15px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto' }}>
            {description}
          </p>
          
          <Link to={actionPath} style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--wire)',
            color: 'var(--ink)',
            padding: '10px 24px',
            borderRadius: '6px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            display: 'inline-block'
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.borderColor = 'var(--trace)'; 
            e.currentTarget.style.color = 'var(--trace)'; 
            e.currentTarget.style.backgroundColor = 'var(--trace-dim)'; 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.borderColor = 'var(--wire)'; 
            e.currentTarget.style.color = 'var(--ink)'; 
            e.currentTarget.style.backgroundColor = 'transparent'; 
          }}
          >
            {actionText}
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default EmptyStateCard;
