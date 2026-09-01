import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="bg-grid" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="bezel-panel corner-marks" style={{ width: '100%', maxWidth: '400px', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', color: 'var(--ink-dim)' }}>
          <FileQuestion size={48} strokeWidth={1} />
        </div>
        
        <h2 className="heading-lg" style={{ marginBottom: '12px' }}>Page Not Found</h2>
        <p style={{ color: 'var(--ink-dim)', fontSize: '13px', lineHeight: 1.6, marginBottom: '32px' }}>
          The requested route does not exist in this console. Please check the URL or return to the dashboard.
        </p>

        <Link
          to="/audit/upload"
          style={{
            display: 'inline-flex', padding: '12px 24px',
            backgroundColor: 'var(--trace)', color: 'var(--substrate)',
            fontWeight: 600, fontSize: '14px', borderRadius: '2px',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
      
      <div className="mono" style={{ position: 'absolute', bottom: '24px', right: '24px', fontSize: '10px', color: 'var(--wire)' }}>
        SIH26155 · v0.1
      </div>
    </div>
  );
};

export default NotFound;
