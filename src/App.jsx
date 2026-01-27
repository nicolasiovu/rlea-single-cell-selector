import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Folder, CheckCircle, Scissors, Upload, X, Square, Maximize2 } from 'lucide-react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';
const START_FOLDER_ID = import.meta.env.VITE_START_FOLDER_ID;
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

export default function ImageCropUploader() {
  const [screen, setScreen] = useState('login');
  const [accessToken, setAccessToken] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(START_FOLDER_ID);
  const [folderStack, setFolderStack] = useState([]);
  const [currentPath, setCurrentPath] = useState(['Root']);
  const [folderList, setFolderList] = useState([]);
  const [folders, setFolders] = useState({
    processed: null,
    output: null
  });
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedIndices, setProcessedIndices] = useState(new Set());
  const [currentImage, setCurrentImage] = useState(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentFileId, setCurrentFileId] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [allComplete, setAllComplete] = useState(false);
  
  // Cropping state
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const [savedCrops, setSavedCrops] = useState([]);
  const [uploadingCrop, setUploadingCrop] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageScale, setImageScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleLogin = () => {
    if (password === APP_PASSWORD) {
      setScreen('folder-selector');
      setLoginError('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  const connectGoogleDrive = () => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          loadFolders(START_FOLDER_ID, response.access_token);
        }
      }
    });
    tokenClient.requestAccessToken();
  };

  const loadFolders = async (folderId, token) => {
    const tkn = token || accessToken;
    if (!tkn) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType='application/vnd.google-apps.folder'&fields=files(id,name)&orderBy=name`,
        { headers: { 'Authorization': `Bearer ${tkn}` } }
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

  const startProcessing = async () => {
    setScreen('processing');
    setImages([]);
    setCurrentIndex(0);
    setProcessedIndices(new Set());
    setCurrentImage(null);
    setCurrentFileName('');
    setCurrentFileId('');
    setSavedCrops([]);
    setNextPageToken(null);
    setAllComplete(false);
    await loadImageBatch();
  };

  const loadImageBatch = async () => {
    if (!accessToken || !folders.processed) return;
    
    setLoading(true);
    try {
      let query = `'${folders.processed.id}' in parents and (mimeType contains 'image/')`;
      let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name),nextPageToken`;
      
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const data = await response.json();
      
      if (data.files) {
        const newImages = [...images, ...data.files];
        setImages(newImages);
        setNextPageToken(data.nextPageToken || null);
        
        if (data.files.length > 0 && currentIndex === 0 && processedIndices.size === 0) {
          loadCurrentImage(0, newImages);
        }
      }
    } catch (error) {
      alert('Error loading images: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNextValidIndex = (startIndex, direction, processed = processedIndices, imgs = images) => {
    let index = startIndex;
    while (index >= 0 && index < imgs.length) {
      if (!processed.has(index)) {
        return index;
      }
      index += direction;
    }
    return null;
  };

  const loadCurrentImage = async (index = currentIndex, imgs = images) => {
    const validIndex = getNextValidIndex(index, 1, processedIndices, imgs);
    
    if (validIndex === null) {
      const remaining = imgs.length - processedIndices.size;
      if (remaining === 0) {
        if (nextPageToken) {
          await loadImageBatch();
        } else {
          setAllComplete(true);
        }
      }
      return;
    }
    
    setCurrentIndex(validIndex);
    setSavedCrops([]);
    setCropBox(null);
    
    try {
      const file = imgs[validIndex];
      setCurrentFileId(file.id);
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setCurrentImage(url);
      setCurrentFileName(file.name);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        if (imageRef.current) {
          const container = imageRef.current.parentElement;
          const containerWidth = container.clientWidth - 40;
          const containerHeight = container.clientHeight - 40;
          
          const scaleX = containerWidth / img.naturalWidth;
          const scaleY = containerHeight / img.naturalHeight;
          const scale = Math.min(scaleX, scaleY, 1);
          
          const displayWidth = img.naturalWidth * scale;
          const displayHeight = img.naturalHeight * scale;
          
          setImageScale({
            scaleX: scale,
            scaleY: scale,
            offsetX: (containerWidth - displayWidth) / 2,
            offsetY: (containerHeight - displayHeight) / 2,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            displayWidth,
            displayHeight
          });
        }
      };
      img.src = url;
    } catch (error) {
      alert('Error loading image: ' + error.message);
      nextImage();
    }
  };

  const nextImage = useCallback(() => {
    const nextIndex = getNextValidIndex(currentIndex + 1, 1);
    if (nextIndex !== null) {
      loadCurrentImage(nextIndex);
    } else {
      const remaining = images.length - processedIndices.size;
      if (remaining === 0 && nextPageToken) {
        loadImageBatch();
      } else if (remaining === 0 && !nextPageToken) {
        setAllComplete(true);
        setCurrentImage(null);
        setCurrentFileName('');
      }
    }
  }, [currentIndex, images, processedIndices, nextPageToken]);

  const previousImage = useCallback(() => {
    const prevIndex = getNextValidIndex(currentIndex - 1, -1);
    if (prevIndex !== null) {
      loadCurrentImage(prevIndex);
    } else {
      alert('This is the first image');
    }
  }, [currentIndex]);

  const handleCanvasMouseDown = (e) => {
    if (!imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Default to 512x512 box in image coordinates
    const defaultSize = 512 * imageScale.scaleX;
    
    setCropBox({
      startX: x,
      startY: y,
      width: defaultSize,
      height: defaultSize
    });
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !cropBox || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate deltas from start point
    const deltaX = x - cropBox.startX;
    const deltaY = y - cropBox.startY;
    
    // Use the smaller absolute value to maintain a square
    const size = Math.min(Math.abs(deltaX), Math.abs(deltaY));
    
    // Preserve direction based on which way the mouse moved
    const signX = deltaX >= 0 ? 1 : -1;
    const signY = deltaY >= 0 ? 1 : -1;
    
    setCropBox({
      ...cropBox,
      width: size * signX,
      height: size * signY
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const resetCropBox = () => {
    if (!imageRef.current) return;
    const defaultSize = 512 * imageScale.scaleX;
    const rect = imageRef.current.getBoundingClientRect();
    setCropBox({
      startX: 20,
      startY: 20,
      width: defaultSize,
      height: defaultSize
    });
  };

  const cropAndUpload = async () => {
    if (!cropBox || !currentImage || !imageRef.current) return;
    
    setUploadingCrop(true);
    
    try {
      // Create a canvas for cropping
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      // Load the image
      const img = new Image();
      img.src = currentImage;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Calculate crop coordinates in original image space
      const cropX = Math.abs(cropBox.startX) / imageScale.scaleX;
      const cropY = Math.abs(cropBox.startY) / imageScale.scaleY;
      const cropWidth = Math.abs(cropBox.width) / imageScale.scaleX;
      const cropHeight = Math.abs(cropBox.height) / imageScale.scaleY;
      
      // Draw and scale to 512x512
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, 512, 512
      );
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      // Generate filename
      const baseName = currentFileName.replace(/\.[^/.]+$/, '');
      const cropNumber = savedCrops.length + 1;
      const newFileName = `${baseName}_crop${cropNumber}.png`;
      
      // Upload to Google Drive
      const metadata = {
        name: newFileName,
        parents: [folders.output.id]
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);
      
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
      });
      
      // Save crop to list
      setSavedCrops([...savedCrops, {
        box: { ...cropBox },
        fileName: newFileName
      }]);
      
      // Reset crop box for next selection
      setCropBox(null);
      
    } catch (error) {
      alert('Error uploading crop: ' + error.message);
    } finally {
      setUploadingCrop(false);
    }
  };

  const markAsComplete = () => {
    setProcessedIndices(prev => {
      const newProcessed = new Set(prev);
      newProcessed.add(currentIndex);
      
      const remaining = images.length - newProcessed.size;
      if (remaining === 0 && !nextPageToken) {
        setAllComplete(true);
        setCurrentImage(null);
        setCurrentFileName('');
      }
      
      return newProcessed;
    });
    
    nextImage();
  };

  useEffect(() => {
    if (screen !== 'processing' || allComplete) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') previousImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Enter' && cropBox) cropAndUpload();
      else if (e.key === 'n' || e.key === 'N') markAsComplete();
      else if (e.key === 'Escape') setCropBox(null);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, allComplete, cropBox, previousImage, nextImage]);

  const remaining = images.length - processedIndices.size;

  return (
    <div style={{
      minHeight: '100vh',
      height: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: '"Work Sans", system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        
        .crop-box {
          position: absolute;
          border: 3px solid #6366f1;
          background: rgba(99, 102, 241, 0.15);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
          pointer-events: none;
        }
        
        .saved-crop {
          position: absolute;
          border: 2px dashed #10b981;
          background: rgba(16, 185, 129, 0.08);
          pointer-events: none;
        }
        
        .image-container {
          user-select: none;
          -webkit-user-drag: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
        
        .image-container img {
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>

      {/* Header */}
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
            fontSize: '24px',
            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
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

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: '100%',
          maxWidth: screen === 'processing' ? '1400px' : '900px',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          maxHeight: '100%',
          overflowY: 'auto'
        }}>
          {screen === 'login' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 12px 24px rgba(99, 102, 241, 0.4)'
                }}>
                  <Scissors color="white" size={40} />
                </div>
                <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '32px', fontWeight: '700' }}>
                  Image Crop & Upload Tool
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
                  Select regions from microscope images, crop to 512×512, and upload to Drive
                </p>
              </div>
              
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
                    transition: 'all 0.2s',
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
              
              {loginError && (
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
                  {loginError}
                </div>
              )}
            </div>
          )}

          {screen === 'folder-selector' && (
            <div>
              <h1 style={{ color: '#f8fafc', marginBottom: '10px', fontSize: '28px', fontWeight: '700' }}>
                Folder Configuration
              </h1>
              <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '15px' }}>
                Select input and output folders for processing
              </p>

              {!accessToken ? (
                <button
                  onClick={connectGoogleDrive}
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
                      { key: 'processed', label: 'Source Images', icon: '📥', color: '#f59e0b' },
                      { key: 'output', label: 'Cropped Output', icon: '✂️', color: '#6366f1' }
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
          )}

          {screen === 'processing' && (
            <div>
              {allComplete ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                    🎉
                  </div>
                  <h1 style={{ 
                    color: '#10b981', 
                    marginBottom: '15px', 
                    fontSize: '36px',
                    fontWeight: '700'
                  }}>
                    Processing Complete!
                  </h1>
                  <p style={{ 
                    color: '#94a3b8', 
                    fontSize: '18px', 
                    marginBottom: '40px',
                    maxWidth: '500px',
                    margin: '0 auto 40px'
                  }}>
                    All {images.length} images have been processed
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setScreen('folder-selector')}
                      style={{
                        padding: '16px 32px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '2px solid #6366f1',
                        color: '#a5b4fc',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.3)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.2)'}
                    >
                      ← Folder Selection
                    </button>
                    <button
                      onClick={startProcessing}
                      style={{
                        padding: '16px 32px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
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
                      Process More →
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px' }}>
                      Crop & Upload
                    </h2>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        fontWeight: '700', 
                        color: '#a5b4fc',
                        fontFamily: '"Space Mono", monospace',
                        fontSize: '15px'
                      }}>
                        {remaining} REMAINING
                      </span>
                      <span style={{ 
                        color: '#64748b',
                        fontFamily: '"Space Mono", monospace',
                        fontSize: '13px'
                      }}>
                        {savedCrops.length} crops saved
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    textAlign: 'center', 
                    color: '#64748b', 
                    margin: '12px 0', 
                    fontSize: '13px',
                    fontFamily: '"Space Mono", monospace',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(99, 102, 241, 0.1)'
                  }}>
                    DRAG to select square region • ENTER to upload • N for next • ESC to clear • ← → navigate
                  </div>

                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    padding: '20px',
                    minHeight: '700px',
                    maxHeight: '700px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {currentImage ? (
                      <div
                        ref={imageRef}
                        className="image-container"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                          position: 'relative',
                          cursor: 'crosshair',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        <img 
                          src={currentImage} 
                          alt="Current" 
                          draggable="false"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '660px',
                            borderRadius: '8px',
                            display: 'block',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserDrag: 'none'
                          }} 
                        />
                        
                        {/* Saved crops overlay */}
                        {savedCrops.map((crop, i) => (
                          <div
                            key={i}
                            className="saved-crop"
                            style={{
                              left: `${Math.min(crop.box.startX, crop.box.startX + crop.box.width)}px`,
                              top: `${Math.min(crop.box.startY, crop.box.startY + crop.box.height)}px`,
                              width: `${Math.abs(crop.box.width)}px`,
                              height: `${Math.abs(crop.box.height)}px`
                            }}
                          />
                        ))}
                        
                        {/* Current crop box */}
                        {cropBox && (
                          <div
                            className="crop-box"
                            style={{
                              left: `${Math.min(cropBox.startX, cropBox.startX + cropBox.width)}px`,
                              top: `${Math.min(cropBox.startY, cropBox.startY + cropBox.height)}px`,
                              width: `${Math.abs(cropBox.width)}px`,
                              height: `${Math.abs(cropBox.height)}px`
                            }}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '-30px',
                              right: '0',
                              background: 'rgba(99, 102, 241, 0.95)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              fontFamily: '"Space Mono", monospace',
                              whiteSpace: 'nowrap'
                            }}>
                              {Math.round(Math.abs(cropBox.width) / imageScale.scaleX)}px square
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        color: '#64748b',
                        fontSize: '16px',
                        fontFamily: '"Space Mono", monospace'
                      }}>
                        LOADING...
                      </div>
                    )}
                  </div>

                  <div style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#cbd5e1',
                    marginBottom: '20px',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '14px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    {currentFileName}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <button
                      onClick={resetCropBox}
                      disabled={!currentImage}
                      style={{
                        padding: '18px',
                        fontSize: '14px',
                        background: currentImage ? 'rgba(139, 92, 246, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                        border: currentImage ? '2px solid #8b5cf6' : '2px solid rgba(71, 85, 105, 0.3)',
                        color: currentImage ? '#c4b5fd' : '#64748b',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: currentImage ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => { if (currentImage) e.target.style.background = 'rgba(139, 92, 246, 0.3)'; }}
                      onMouseLeave={(e) => { if (currentImage) e.target.style.background = 'rgba(139, 92, 246, 0.2)'; }}
                    >
                      <Square size={16} />
                      New 512×512
                    </button>
                    
                    <button
                      onClick={cropAndUpload}
                      disabled={!cropBox || uploadingCrop}
                      style={{
                        padding: '18px',
                        fontSize: '14px',
                        background: cropBox && !uploadingCrop 
                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                          : 'rgba(71, 85, 105, 0.2)',
                        border: 'none',
                        color: cropBox && !uploadingCrop ? 'white' : '#64748b',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: cropBox && !uploadingCrop ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => { if (cropBox && !uploadingCrop) e.target.style.opacity = '0.9'; }}
                      onMouseLeave={(e) => { if (cropBox && !uploadingCrop) e.target.style.opacity = '1'; }}
                    >
                      <Upload size={16} />
                      {uploadingCrop ? 'Uploading...' : 'Upload Crop'}
                    </button>
                    
                    <button
                      onClick={markAsComplete}
                      disabled={!currentImage}
                      style={{
                        padding: '18px',
                        fontSize: '14px',
                        background: currentImage ? 'rgba(245, 158, 11, 0.2)' : 'rgba(71, 85, 105, 0.2)',
                        border: currentImage ? '2px solid #f59e0b' : '2px solid rgba(71, 85, 105, 0.3)',
                        color: currentImage ? '#fbbf24' : '#64748b',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: currentImage ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => { if (currentImage) e.target.style.background = 'rgba(245, 158, 11, 0.3)'; }}
                      onMouseLeave={(e) => { if (currentImage) e.target.style.background = 'rgba(245, 158, 11, 0.2)'; }}
                    >
                      <CheckCircle size={16} />
                      Done (N)
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={previousImage}
                      disabled={!currentImage}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: currentImage ? 'rgba(71, 85, 105, 0.3)' : 'rgba(71, 85, 105, 0.2)',
                        color: currentImage ? '#cbd5e1' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: currentImage ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => { if (currentImage) e.target.style.background = 'rgba(71, 85, 105, 0.5)'; }}
                      onMouseLeave={(e) => { if (currentImage) e.target.style.background = 'rgba(71, 85, 105, 0.3)'; }}
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={nextImage}
                      disabled={!currentImage}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: currentImage ? 'rgba(71, 85, 105, 0.3)' : 'rgba(71, 85, 105, 0.2)',
                        color: currentImage ? '#cbd5e1' : '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        cursor: currentImage ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontFamily: '"Space Mono", monospace',
                        fontSize: '13px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => { if (currentImage) e.target.style.background = 'rgba(71, 85, 105, 0.5)'; }}
                      onMouseLeave={(e) => { if (currentImage) e.target.style.background = 'rgba(71, 85, 105, 0.3)'; }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
