import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import FolderSelector from './pages/FolderSelector';
import Processing from './pages/Processing';

export default function App() {
  const [config, setConfig] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const handleConfigComplete = (folderConfig, token) => {
    setConfig(folderConfig);
    setAccessToken(token);
  };

  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        height: '100vh',
        background: 'linear-gradient(to bottom right, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: '"Work Sans", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
          
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          
          .image-container {
            user-select: none;
            -webkit-user-drag: none;
          }
          
          .image-container img {
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
          }
        `}</style>

        <Header accessToken={accessToken} />

        <div style={{
          flex: 1,
          padding: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1400px',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            maxHeight: '100%',
            overflowY: 'auto'
          }}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/folders" element={<FolderSelector onConfigComplete={handleConfigComplete} />} />
              <Route path="/process" element={<Processing config={config} accessToken={accessToken} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}