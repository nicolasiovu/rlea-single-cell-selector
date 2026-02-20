import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Folder } from 'lucide-react';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { listFolders } from '../utils/driveApi';

const START_FOLDER_ID = import.meta.env.VITE_START_FOLDER_ID;

export default function FolderSelector({ onConfigComplete }) {
  const { accessToken, connectDrive } = useGoogleAuth();
  const navigate = useNavigate();
  
  const [currentFolderId, setCurrentFolderId] = useState(START_FOLDER_ID);
  const [folderStack, setFolderStack] = useState([]);
  const [currentPath, setCurrentPath] = useState(['Root']);
  const [folderList, setFolderList] = useState([]);
  const [folders, setFolders] = useState({
    processed: null,
    output: null,
    completed: null
  });

  useEffect(() => {
    if (accessToken) {
      loadFolders(START_FOLDER_ID);
    }
  }, [accessToken]);

  const loadFolders = async (folderId) => {
    try {
      const folders = await listFolders(folderId, accessToken);
      setFolderList(folders);
    } catch (error) {
      alert('Error loading folders: ' + error.message);
    }
  };

  const enterFolder = (folderId, folderName) => {
    setFolderStack([...folderStack, currentFolderId]);
    setCurrentFolderId(folderId);
    setCurrentPath([...currentPath, folderName]);
    loadFolders(folderId);
  };

  const goBack = () => {
    if (folderStack.length === 0) {
      alert('Already at root folder');
      return;
    }
    const newStack = [...folderStack];
    const previousId = newStack.pop();
    const newPath = [...currentPath];
    newPath.pop();
    
    setFolderStack(newStack);
    setCurrentFolderId(previousId);
    setCurrentPath(newPath);
    loadFolders(previousId);
  };

  const setFolderHandler = (folderType) => {
    setFolders({
      ...folders,
      [folderType]: {
        id: currentFolderId,
        path: currentPath.join(' / ')
      }
    });
  };

  const allFoldersSet = Object.values(folders).every(f => f !== null);

  const startProcessing = () => {
    onConfigComplete(folders, accessToken);
    navigate('/process');
  };

  return (
    <div>
      <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '28px', fontWeight: '700' }}>
        Folder Configuration
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '15px' }}>
        Select input, output, and completed folders for processing
      </p>

      {!accessToken ? (
        <button
          onClick={connectDrive}
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: '#f8fafc',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect Google Drive
        </button>
      ) : (
        <div>
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <label style={{ 
              color: '#94a3b8', 
              fontWeight: '600', 
              display: 'block', 
              marginBottom: '10px',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: '"Space Mono", monospace'
            }}>
              Current Location
            </label>
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '14px',
              borderRadius: '8px',
              fontFamily: '"Space Mono", monospace',
              fontSize: '13px',
              color: '#cbd5e1',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              {currentPath.join(' / ')}
            </div>
          </div>

          <div style={{
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '10px',
            maxHeight: '350px',
            overflowY: 'auto',
            margin: '20px 0',
            background: 'rgba(15, 23, 42, 0.4)'
          }}>
            {folderList.map(folder => (
              <div
                key={folder.id}
                onClick={() => enterFolder(folder.id, folder.name)}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s',
                  color: '#f8fafc'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Folder size={20} color="#6366f1" />
                {folder.name}
              </div>
            ))}
          </div>

          <button
            onClick={goBack}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(71, 85, 105, 0.3)',
              color: '#cbd5e1',
              border: '1px solid rgba(71, 85, 105, 0.5)',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s',
              fontFamily: '"Space Mono", monospace',
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(71, 85, 105, 0.5)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(71, 85, 105, 0.3)'}
          >
            <ChevronLeft size={18} />
            Go Back
          </button>

          <div style={{ marginTop: '40px' }}>
            <h2 style={{ 
              marginBottom: '20px', 
              color: '#f8fafc',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              Folder Assignments
            </h2>
            
            {[
              { key: 'processed', label: 'Source Images (Input)', icon: '📥', color: '#f59e0b' },
              { key: 'output', label: 'Cropped Output', icon: '✂️', color: '#6366f1' },
              { key: 'completed', label: 'Completed Originals', icon: '✅', color: '#10b981' }
            ].map(({ key, label, icon, color }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px',
                marginBottom: '12px',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '10px',
                border: `1px solid ${folders[key] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}`
              }}>
                <div>
                  <h3 style={{ 
                    fontSize: '16px', 
                    marginBottom: '6px', 
                    color: '#f8fafc',
                    fontWeight: '600'
                  }}>
                    {icon} {label}
                  </h3>
                  <div style={{
                    color: folders[key] ? '#10b981' : '#64748b',
                    fontSize: '13px',
                    fontWeight: folders[key] ? '600' : 'normal',
                    fontFamily: '"Space Mono", monospace'
                  }}>
                    {folders[key] ? `✓ ${folders[key].path.length > 50 ? '...' + folders[key].path.slice(-47) : folders[key].path}` : 'Not configured'}
                  </div>
                </div>
                <button
                  onClick={() => setFolderHandler(key)}
                  style={{
                    padding: '12px 24px',
                    background: color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: '"Space Mono", monospace',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.85'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  Set Folder
                </button>
              </div>
            ))}

            <button
              onClick={startProcessing}
              disabled={!allFoldersSet}
              style={{
                width: '100%',
                padding: '20px',
                marginTop: '24px',
                background: allFoldersSet 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(71, 85, 105, 0.3)',
                color: allFoldersSet ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: allFoldersSet ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontFamily: '"Space Mono", monospace',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => { if (allFoldersSet) e.target.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { if (allFoldersSet) e.target.style.opacity = '1'; }}
            >
              Begin Processing →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}