import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Upload, Square, Save, ChevronLeft } from 'lucide-react';
import { AppContext } from '../context/AppContext.jsx';

export default function Processing() {
  const navigate = useNavigate();
  const { 
    accessToken, folders, images, setImages, 
    nextPageToken, setNextPageToken, 
    processedIndices, setProcessedIndices,
    defaultLabel, setDefaultLabel 
  } = useContext(AppContext);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [movingFiles, setMovingFiles] = useState(false);
  
  // Cropping State
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const [savedCrops, setSavedCrops] = useState([]);
  const [uploadingCrop, setUploadingCrop] = useState(false);
  
  const imageRef = useRef(null);

  useEffect(() => {
    if (!accessToken || !folders.processed) {
      navigate('/folders');
      return;
    }
    if (images.length === 0) {
      loadImageBatch();
    }
  }, []);

  const loadImageBatch = async () => {
    setLoading(true);
    try {
      let query = `'${folders.processed.id}' in parents and (mimeType contains 'image/') and trashed = false`;
      let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name),nextPageToken`;
      if (nextPageToken) url += `&pageToken=${nextPageToken}`;
      
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      const data = await response.json();
      
      if (data.files) {
        setImages(prev => [...prev, ...data.files]);
        setNextPageToken(data.nextPageToken || null);
      }
    } catch (error) {
      alert('Error loading images: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Blob on demand to avoid memory leaks
  useEffect(() => {
    let isMounted = true;
    if (!images[currentIndex]) return;
    
    setCurrentImageUrl(null);
    setCropBox(null);
    setSavedCrops([]);

    const fetchImage = async () => {
      try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${images[currentIndex].id}?alt=media`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const blob = await res.blob();
        if (isMounted) setCurrentImageUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error("Failed to load image blob", e);
      }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, [currentIndex, images, accessToken]);

  const currentFile = images[currentIndex];

  // Navigation Logic (Unrestricted)
  const previousImage = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }, [currentIndex]);

  const nextImage = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (nextPageToken) {
      loadImageBatch();
    }
  }, [currentIndex, images.length, nextPageToken]);

  const markAsComplete = useCallback(() => {
    if (!currentFile) return;
    // Mark this file's ID as processed
    setProcessedIndices(prev => new Set(prev).add(currentFile.id));
    
    // Jump to the next unprocessed image if possible
    const nextUnprocessed = images.findIndex((img, i) => i > currentIndex && !processedIndices.has(img.id));
    if (nextUnprocessed !== -1) {
      setCurrentIndex(nextUnprocessed);
    } else {
      nextImage(); // Fallback to just stepping forward
    }
  }, [currentFile, processedIndices, images, currentIndex, nextImage]);

  // Canvas Handlers
  const handleCanvasMouseDown = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    setCropBox({
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      width: 0, height: 0
    });
    setIsDrawing(true);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !cropBox || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const deltaX = x - cropBox.startX;
    const deltaY = y - cropBox.startY;
    const size = Math.min(Math.abs(deltaX), Math.abs(deltaY)); // Force square
    
    setCropBox({
      ...cropBox,
      width: size * (deltaX >= 0 ? 1 : -1),
      height: size * (deltaY >= 0 ? 1 : -1)
    });
  };

  const handleCanvasMouseUp = () => setIsDrawing(false);

  // Normalize negative coordinate bounds to purely positive bounds
  const getNormalizedCrop = () => {
    if (!cropBox) return null;
    let { startX, startY, width, height } = cropBox;
    if (width < 0) { startX += width; width = Math.abs(width); }
    if (height < 0) { startY += height; height = Math.abs(height); }
    return { x: startX, y: startY, w: width, h: height };
  };

  const cropAndUpload = async () => {
    if (!cropBox || !currentImageUrl || !imageRef.current) return;
    setUploadingCrop(true);
    
    try {
      const img = new Image();
      img.src = currentImageUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      // Calculate scale from rendered dimensions to actual image dimensions
      const scaleX = img.naturalWidth / imageRef.current.width;
      const scaleY = img.naturalHeight / imageRef.current.height;
      
      const norm = getNormalizedCrop();
      
      // Target coordinates on the original unscaled image
      const finalX = norm.x * scaleX;
      const finalY = norm.y * scaleY;
      const finalW = norm.w * scaleX;
      const finalH = norm.h * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      ctx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, 512, 512);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
      
      const baseName = currentFile.name.replace(/\.[^/.]+$/, '');
      const newFileName = `${baseName}_crop${savedCrops.length + 1}.jpg`;
      
      // METADATA INSERTION
      const metadata = {
        name: newFileName,
        parents: [folders.output.id],
        // Added position data to the description
        description: `Crop extracted from ${currentFile.name}. Label: ${defaultLabel}. Position: X=${Math.round(finalX)}, Y=${Math.round(finalY)}, W=${Math.round(finalW)}, H=${Math.round(finalH)}`,
        appProperties: {
          originalId: currentFile.id,
          originalName: currentFile.name,
          label: defaultLabel,
          cropX: Math.round(finalX).toString(),
          cropY: Math.round(finalY).toString(),
          cropWidth: Math.round(finalW).toString(),
          cropHeight: Math.round(finalH).toString()
        }
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob, newFileName);
      
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: form
      });
      
      setSavedCrops([...savedCrops, { box: norm }]);
      setCropBox(null);
    } catch (error) {
      alert('Error uploading crop: ' + error.message);
    } finally {
      setUploadingCrop(false);
    }
  };

  const handleBatchMove = async () => {
    if (processedIndices.size === 0) return;
    if (!window.confirm(`Move ${processedIndices.size} completed images to the Completed folder?`)) return;
    
    setMovingFiles(true);
    try {
      const moves = Array.from(processedIndices).map(id => 
        fetch(`https://www.googleapis.com/drive/v3/files/${id}?addParents=${folders.completed.id}&removeParents=${folders.processed.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
      );
      await Promise.all(moves);
      
      // Clear them from memory
      const remainingImages = images.filter(img => !processedIndices.has(img.id));
      setImages(remainingImages);
      setProcessedIndices(new Set());
      setCurrentIndex(0);
      alert('Successfully moved completed images!');
    } catch (e) {
      alert('Error moving files: ' + e.message);
    } finally {
      setMovingFiles(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (movingFiles || loading) return;
      if (e.key === 'ArrowLeft') previousImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Enter' && cropBox) cropAndUpload();
      else if ((e.key === 'n' || e.key === 'N') && !isDrawing) markAsComplete();
      else if (e.key === 'Escape') setCropBox(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previousImage, nextImage, cropAndUpload, markAsComplete, movingFiles, loading, cropBox, isDrawing]);

  if (!images.length && !loading) return (
    <div style={{ padding: '40px', color: 'white' }}>No images found in the source folder.</div>
  );

  const normCrop = getNormalizedCrop();

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: '"Work Sans", sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ padding: '20px 40px', background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/folders')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronLeft size={20} /> Back to Folders
        </button>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase' }}>Label:</span>
            <input 
              type="text" 
              value={defaultLabel} 
              onChange={e => setDefaultLabel(e.target.value)}
              style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px', fontFamily: '"Space Mono", monospace' }}
            />
          </div>
          <button 
            onClick={handleBatchMove} 
            disabled={processedIndices.size === 0 || movingFiles}
            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: processedIndices.size === 0 ? 'not-allowed' : 'pointer', opacity: processedIndices.size === 0 ? 0.5 : 1 }}
          >
            <Save size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/>
            {movingFiles ? 'Moving...' : `Move ${processedIndices.size} Completed`}
          </button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div style={{ flex: 1, padding: '30px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1200px', background: '#1e293b', borderRadius: '16px', padding: '30px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#cbd5e1' }}>
            <h2 style={{ margin: 0 }}>{currentFile?.name}</h2>
            <div style={{ fontFamily: '"Space Mono", monospace' }}>
              Image {currentIndex + 1} of {images.length} {nextPageToken && '(More available)'}
            </div>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {!currentImageUrl ? <div style={{ color: '#64748b' }}>LOADING...</div> : (
              
              // Key fix: Wrap the image tightly so mouse coordinates match the image top-left exactly
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <img 
                  ref={imageRef}
                  src={currentImageUrl} 
                  alt="Microscope" 
                  draggable="false"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '660px', borderRadius: '4px', cursor: 'crosshair', userSelect: 'none' }} 
                />
                
                {savedCrops.map((c, i) => (
                  <div key={i} style={{ position: 'absolute', border: '2px dashed #10b981', background: 'rgba(16, 185, 129, 0.1)', pointerEvents: 'none', left: c.box.x, top: c.box.y, width: c.box.w, height: c.box.h }} />
                ))}

                {normCrop && (
                  <div style={{ position: 'absolute', border: '2px solid #6366f1', background: 'rgba(99, 102, 241, 0.15)', pointerEvents: 'none', left: normCrop.x, top: normCrop.y, width: normCrop.w, height: normCrop.h }} />
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
            <button onClick={() => setCropBox(null)} disabled={!cropBox} style={{ padding: '16px', background: '#334155', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              <Square size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Cancel Crop (ESC)
            </button>
            <button onClick={cropAndUpload} disabled={!cropBox || uploadingCrop} style={{ padding: '16px', background: '#6366f1', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              <Upload size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> {uploadingCrop ? 'Uploading...' : 'Upload Crop (ENTER)'}
            </button>
            <button onClick={markAsComplete} disabled={!currentImageUrl} style={{ padding: '16px', background: '#f59e0b', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }}/> Mark Done (N)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <button onClick={previousImage} disabled={currentIndex === 0} style={{ flex: 1, padding: '14px', background: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}>
              ← Previous Image
            </button>
            <button onClick={nextImage} disabled={currentIndex === images.length - 1 && !nextPageToken} style={{ flex: 1, padding: '14px', background: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Next Image →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}