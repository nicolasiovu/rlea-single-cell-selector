import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (password === APP_PASSWORD) {
      navigate('/folders');
    } else {
      setError('Incorrect password');
    }
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        <Scissors color="white" size={40} />
      </div>
      <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '32px', fontWeight: '700' }}>
        Image Crop & Upload Tool
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '500px', margin: '0 auto 40px' }}>
        Select regions from microscope images, crop to 512×512, and upload to Drive with metadata
      </p>
      
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: '600', 
          marginBottom: '10px',
          color: '#f8fafc',
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: '"Space Mono", monospace'
        }}>
          Access Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          placeholder="Enter password"
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            fontSize: '16px',
            color: '#f8fafc',
            outline: 'none',
            transition: 'border-color 0.2s',
            fontFamily: '"Space Mono", monospace'
          }}
          onFocus={(e) => e.target.style.borderColor = '#6366f1'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
        />
      </div>
      
      <button
        onClick={handleLogin}
        style={{
          width: '100%',
          padding: '18px',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: '700',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: '"Space Mono", monospace',
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      >
        Authenticate
      </button>
      
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          borderRadius: '10px',
          fontFamily: '"Space Mono", monospace',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}