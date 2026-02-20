import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, Upload, CheckCircle } from 'lucide-react';
import LabelSelector from '../components/LabelSelector';
import { createCrop, getCropMetadata } from '../utils/imageCrop';
// Switched from batchMoveFiles to just moveFile
import { uploadCroppedImage, moveFile } from '../utils/driveApi'; 
import { useImageManager } from '../hooks/useImageManager';

export default function Processing({ config, accessToken }) {
  const navigate = useNavigate();
  const imageRef = useRef(null);
  
  const {
    images,
    currentImage,
    currentFileName,
    currentFileId,
    imageScale,
    processedIndices,
    processedFileIds,
    loading,
    loadBatch,
    goToNext,
    goToPrevious,
    markAsProcessed,
    reset
  } = useImageManager(accessToken, config?.processed?.id);

  const [isDrawing, setIsDrawing] = useState(false);
  const [cropBox, setCropBox] = useState(null);
  const [savedCrops, setSavedCrops] = useState([]);
  const [uploadingCrop, setUploadingCrop] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [showLabelSelector, setShowLabelSelector] = useState(false);
  const [pendingCrop, setPendingCrop] = useState(null);
  const [defaultLabel, setDefaultLabel] = useState('phytolith');
  const [showSettings, setShowSettings] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (!config || !accessToken) {
      navigate('/folders');
      return;
    }
    loadBatch();
  }, [config, accessToken]);

  const handleCanvasMouseDown = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
    
    const deltaX = x - cropBox.startX;
    const deltaY = y - cropBox.startY;
    const size = Math.min(Math.abs(deltaX), Math.abs(deltaY));
    const signX = deltaX >= 0 ? 1 : -1;
    const signY = deltaY >= 0 ? 1 : -1;
    
    setCropBox({
      ...cropBox,
      width: size * signX,
      height: size * signY
    });
  };

  const handleCanvasMouseUp = () => setIsDrawing(false);

  const resetCropBox = () => {
    if (!imageRef.current) return;
    const defaultSize = 512 * imageScale.scaleX;
    setCropBox({
      startX: 20,
      startY: 20,
      width: defaultSize,
      height: defaultSize
    });
  };

  const initiateUpload = () => {
    if (!cropBox) return;
    setPendingCrop(cropBox);
    setShowLabelSelector(true);
  };

  const handleLabelSelected = async (label) => {
    setShowLabelSelector(false);
    if (!pendingCrop) return;
    await cropAndUpload(pendingCrop, label);
    setPendingCrop(null);
  };

  const cropAndUpload = async (cropBoxToUse, label) => {
    if (!currentImage || !imageRef.current) return;
    setUploadingCrop(true);
    
    try {
      const blob = await createCrop(currentImage, cropBoxToUse, imageScale);
      const baseName = currentFileName.replace(/\.[^/.]+$/, '');
      const randomId = Math.random().toString(36).substr(2, 9);
      const cropNumber = savedCrops.length + 1;
      const newFileName = `${baseName}_${randomId}_crop${cropNumber}.png`;
      const metadata = getCropMetadata(cropBoxToUse, imageScale, currentFileName, label);
      
      await uploadCroppedImage(
        blob, 
        newFileName, 
        config.output.id, 
        metadata, 
        accessToken
      );
      
      setSavedCrops([...savedCrops, {
        box: { ...cropBoxToUse },
        fileName: newFileName,
        label: label
      }]);
      setCropBox(null);
      
    } catch (error) {
      alert('Error uploading crop: ' + error.message);
      console.error(error);
    } finally {
      setUploadingCrop(false);
    }
  };

  const markAsComplete = async () => {
    if (isMoving) return;
    setIsMoving(true); 

    try {
      // Move immediately to completed folder upon clicking 'Done'
      // We removed config.processed.id from here!
      await moveFile(
        currentFileId,
        config.completed.id,
        accessToken
      );

      markAsProcessed();
      
      const result = await goToNext();
      if (result === 'complete') {
        setAllComplete(true);
      } else {
        setSavedCrops([]);
        setCropBox(null);
      }
    } catch (error) {
       alert('Error moving file: ' + error.message);
       console.error(error);
    } finally {
      setIsMoving(false); 
    }
  };

  const handlePrevious = async () => {
    const success = await goToPrevious();
    if (success) {
      setSavedCrops([]);
      setCropBox(null);
    } else {
      alert('This is the first unprocessed image');
    }
  };

  const handleNext = async () => {
    const result = await goToNext();
    if (result === 'complete') {
      setAllComplete(true);
    } else {
      setSavedCrops([]);
      setCropBox(null);
    }
  };

  useEffect(() => {
    if (!currentImage || allComplete) return;
    
    const handleKeyDown = (e) => {
      if (showLabelSelector) return;
      
      if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Enter' && cropBox) initiateUpload();
      else if (e.key === 'n' || e.key === 'N') markAsComplete();
      else if (e.key === 'Escape') setCropBox(null);
      else if (e.key === 's' || e.key === 'S') resetCropBox();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImage, allComplete, cropBox, showLabelSelector]);

  const remaining = images.length - processedIndices.size;

  if (!config || !accessToken) return null;

  return (
    <div>
      {allComplete ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
          <h1 style={{ color: '#10b981', marginBottom: '15px', fontSize: '36px', fontWeight: '700' }}>
            Batch Complete!
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '10px' }}>
            You've processed and moved all {images.length} images in this batch.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '40px' }}>
            <button
              onClick={() => { reset(); navigate('/folders'); }}
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
                fontFamily: '"Space Mono", monospace'
              }}
            >
              Return to Folders →
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
            <div>
              <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '20px', marginBottom: '4px' }}>
                Crop & Upload
              </h2>
              <div style={{ color: '#64748b', fontFamily: '"Space Mono", monospace', fontSize: '13px' }}>
                Default label: <span style={{ color: '#a5b4fc', fontWeight: '700' }}>{defaultLabel}</span>
                {' • '}
                <button
                  onClick={() => setShowSettings(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    fontFamily: '"Space Mono", monospace',
                    padding: 0
                  }}
                >
                  change
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#a5b4fc', fontFamily: '"Space Mono", monospace', fontSize: '15px' }}>
                {remaining} REMAINING
              </span>
              <span style={{ color: '#64748b', fontFamily: '"Space Mono", monospace', fontSize: '13px' }}>
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
            DRAG for square • ENTER upload • N mark done & move • S new box • ESC clear • ← → navigate
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
                
                {savedCrops.map((crop, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      border: '2px dashed #10b981',
                      background: 'rgba(16, 185, 129, 0.08)',
                      pointerEvents: 'none',
                      left: `${Math.min(crop.box.startX, crop.box.startX + crop.box.width)}px`,
                      top: `${Math.min(crop.box.startY, crop.box.startY + crop.box.height)}px`,
                      width: `${Math.abs(crop.box.width)}px`,
                      height: `${Math.abs(crop.box.height)}px`
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '-24px',
                      left: '0',
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      fontFamily: '"Space Mono", monospace',
                      whiteSpace: 'nowrap'
                    }}>
                      {crop.label}
                    </div>
                  </div>
                ))}
                
                {cropBox && (
                  <div
                    style={{
                      position: 'absolute',
                      border: '3px solid #6366f1',
                      background: 'rgba(99, 102, 241, 0.15)',
                      boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.3)',
                      pointerEvents: 'none',
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
              <div style={{ color: '#64748b', fontSize: '16px', fontFamily: '"Space Mono", monospace' }}>
                {loading ? 'LOADING...' : 'NO IMAGE'}
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
                gap: '8px'
              }}
            >
              <Square size={16} />
              New 512×512 (S)
            </button>
            
            <button
              onClick={initiateUpload}
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
                gap: '8px'
              }}
            >
              <Upload size={16} />
              {uploadingCrop ? 'Uploading...' : 'Upload (Enter)'}
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
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              {isMoving ? 'Moving...' : 'Done (N)'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handlePrevious}
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
                fontSize: '13px'
              }}
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
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
                fontSize: '13px'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {showLabelSelector && (
        <LabelSelector
          onSelect={handleLabelSelected}
          onCancel={() => {
            setShowLabelSelector(false);
            setPendingCrop(null);
          }}
          defaultLabel={defaultLabel}
        />
      )}

      {showSettings && (
        <LabelSelector
          onSelect={(label) => {
            setDefaultLabel(label);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
          defaultLabel={defaultLabel}
        />
      )}
    </div>
  );
}