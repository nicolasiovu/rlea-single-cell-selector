import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleLogin = () => {
    if (password === APP_PASSWORD) {
      navigate('/folders');
    } else {
      setLoginError('Incorrect password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: '"Work Sans", system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 12px 24px rgba(99, 102, 241, 0.4)'
          }}>
            <Scissors color="white" size={40} />
          </div>
          <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '32px', fontWeight: '700' }}>
            Image Crop & Upload Tool
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            Select regions from microscope images, crop, and upload to Drive
          </p>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block', color: '#f8fafc', fontSize: '14px',
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px',
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
              width: '100%', padding: '16px',
              background: 'rgba(15, 23, 42, 0.8)', border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '10px', fontSize: '16px', color: '#f8fafc',
              outline: 'none', transition: 'all 0.2s', fontFamily: '"Space Mono", monospace'
            }}
            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'}
          />
        </div>
        
        <button
          onClick={handleLogin}
          style={{
            width: '100%', padding: '18px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '16px', fontWeight: '700', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            fontFamily: '"Space Mono", monospace'
          }}
        >
          Authenticate
        </button>

        {loginError && (
          <div style={{
            marginTop: '20px', padding: '16px',
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5', borderRadius: '10px', fontFamily: '"Space Mono", monospace', fontSize: '14px'
          }}>
            {loginError}
          </div>
        )}
      </div>
    </div>
  );
}