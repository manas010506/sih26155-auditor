import React from 'react';

const SeverityLED = ({ severity }) => {
  const getSeverityColor = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return 'var(--severity-critical)';
      case 'high': return 'var(--severity-high)';
      case 'medium': return 'var(--severity-medium)';
      case 'low': return 'var(--severity-low)';
      default: return 'var(--wire)';
    }
  };

  const color = getSeverityColor(severity);
  const isGlowing = severity === 'critical' || severity === 'high';

  return (
    <div style={{ position: 'relative', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isGlowing && (
        <svg 
          style={{ position: 'absolute' }} 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="8" cy="8" r="7" fill={color} opacity="0.25" />
        </svg>
      )}
      <svg 
        style={{ position: 'relative', zIndex: 1 }} 
        width="10" 
        height="10" 
        viewBox="0 0 10 10" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="5" cy="5" r="4" fill={color} />
      </svg>
    </div>
  );
};

export default SeverityLED;
