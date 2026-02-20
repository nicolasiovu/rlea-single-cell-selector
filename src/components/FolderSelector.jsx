import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Folder, CheckCircle } from 'lucide-react';
import { AppContext } from '../context/AppContext.jsx';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const START_FOLDER_ID = import.meta.env.VITE_START_FOLDER_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

export default function FolderSelector() {
  const navigate = useNavigate();
  const { accessToken, setAccessToken, folders, setFolders, clearProcessingState } = useContext(AppContext);
  
  const [currentFolderId, setCurrentFolderId] = useState(START_FOLDER_ID);
  const [folderStack, setFolderStack] = useState([]);
  const [currentPath, setCurrentPath] = useState(['Root']);
  const [folderList, setFolderList] = useState([]);

  useEffect(() => {
    if (accessToken) {
      loadFolders(START_FOLDER_ID, accessToken);
    }
  }, [accessToken]);

  const connectGoogleDrive = () => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
        }
      }
    });
    tokenClient.requestAccessToken();
  };

  const loadFolders = async (folderId, token = accessToken) => {
    if (!token) return;
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&orderBy=name`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      setFolderList(data.files || []);
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
    if (folderStack.length === 0) return alert('Already at root folder');
    const previousId = folderStack[folderStack.length - 1];
    setFolderStack(folderStack.slice(0, -1));
    setCurrentPath(currentPath.slice(0, -1));
    setCurrentFolderId(previousId);
    loadFolders(previousId);
  };

  const setFolderHandler = (folderType) => {
    setFolders({
      ...folders,
      [folderType]: { id: currentFolderId, path: currentPath.join(' / ') }
    });
  };

  const allFoldersSet = Object.values(folders).every(f => f !== null);

  const startProcessing = () => {
    clearProcessingState(); // Start fresh each time we enter processing
    navigate('/process');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a 0%, #1e293b 50%, #0f172a 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px', fontFamily: '"Work Sans", system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '900px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(20px)', borderRadius: '20px', padding: '40px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '28px', fontWeight: '700' }}>Folder Configuration</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Select source, output, and completion folders</p>

        {!accessToken ? (
          <button onClick={connectGoogleDrive} style={{ width: '100%', padding: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '2px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', color: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '12px' }}>
            Connect Google Drive
          </button>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '8px', color: '#cbd5e1', border: '1px solid rgba(99, 102, 241, 0.2)', fontFamily: '"Space Mono", monospace' }}>
                {currentPath.join(' / ')}
              </div>
            </div>

            <div style={{ border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {folderList.map(folder => (
                <div key={folder.id} onClick={() => enterFolder(folder.id, folder.name)} style={{ padding: '16px', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', color: '#f8fafc' }}>
                  <Folder size={20} color="#6366f1" /> {folder.name}
                </div>
              ))}
            </div>

            <button onClick={goBack} style={{ width: '100%', padding: '14px', background: 'rgba(71, 85, 105, 0.3)', color: '#cbd5e1', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <ChevronLeft size={18} /> Go Back
            </button>

            <div style={{ marginTop: '40px' }}>
              <h2 style={{ color: '#f8fafc', fontSize: '20px', marginBottom: '20px' }}>Folder Assignments</h2>
              
              {[
                { key: 'processed', label: 'Source Images', icon: '📥', color: '#f59e0b' },
                { key: 'output', label: 'Cropped Output', icon: '✂️', color: '#6366f1' },
                { key: 'completed', label: 'Completed Originals', icon: '✅', color: '#10b981' }
              ].map(({ key, label, icon, color }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', marginBottom: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: `1px solid ${folders[key] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}` }}>
                  <div>
                    <h3 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '6px' }}>{icon} {label}</h3>
                    <div style={{ color: folders[key] ? '#10b981' : '#64748b', fontSize: '13px', fontFamily: '"Space Mono", monospace' }}>
                      {folders[key] ? `✓ ${folders[key].path}` : 'Not configured'}
                    </div>
                  </div>
                  <button onClick={() => setFolderHandler(key)} style={{ padding: '12px 24px', background: color, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: '"Space Mono", monospace' }}>
                    Set Folder
                  </button>
                </div>
              ))}

              <button disabled={!allFoldersSet} onClick={startProcessing} style={{ width: '100%', padding: '20px', marginTop: '24px', background: allFoldersSet ? '#10b981' : 'rgba(71, 85, 105, 0.3)', color: allFoldersSet ? 'white' : '#64748b', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: allFoldersSet ? 'pointer' : 'not-allowed', fontFamily: '"Space Mono", monospace' }}>
                Begin Processing →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}