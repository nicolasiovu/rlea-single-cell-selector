import React from 'react';
import { Scissors, CheckCircle } from 'lucide-react';

export default function Header({ accessToken }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
      padding: '20px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          <Scissors color="white" size={24} />
        </div>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '26px', 
            fontWeight: '700',
            color: '#f8fafc',
            letterSpacing: '-0.02em'
          }}>
            Image Crop & Upload
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', fontFamily: '"Space Mono", monospace' }}>
            RLEA | Ramsey Lab for Environmental Archaeology
          </p>
        </div>
      </div>
      {accessToken && (
        <div style={{
          padding: '10px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#10b981',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: '"Space Mono", monospace'
        }}>
          <CheckCircle size={18} />
          CONNECTED
        </div>
      )}
    </div>
  );
}