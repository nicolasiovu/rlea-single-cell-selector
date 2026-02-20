import { useState, useCallback } from 'react';
import { listImages, downloadImage } from '../utils/driveApi';

export function useImageManager(accessToken, sourceFolderId) {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedIndices, setProcessedIndices] = useState(new Set());
  const [processedFileIds, setProcessedFileIds] = useState(new Set());
  const [currentImage, setCurrentImage] = useState(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [currentFileId, setCurrentFileId] = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageScale, setImageScale] = useState({ scaleX: 1, scaleY: 1 });

  const loadBatch = useCallback(async () => {
    if (!accessToken || !sourceFolderId) return;
    
    setLoading(true);
    try {
      const data = await listImages(sourceFolderId, accessToken, nextPageToken);
      
      if (data.files) {
        const newImages = [...images, ...data.files];
        setImages(newImages);
        setNextPageToken(data.nextPageToken || null);
        
        if (data.files.length > 0 && currentIndex === 0 && processedIndices.size === 0) {
          await loadImageAtIndex(0, newImages);
        }
      }
    } catch (error) {
      console.error('Error loading images:', error);
      alert('Error loading images: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, sourceFolderId, nextPageToken, images, currentIndex, processedIndices.size]);

  const getNextValidIndex = useCallback((startIndex, direction) => {
    let index = startIndex;
    while (index >= 0 && index < images.length) {
      if (!processedIndices.has(index)) {
        return index;
      }
      index += direction;
    }
    return null;
  }, [images.length, processedIndices]);

  const loadImageAtIndex = useCallback(async (index, imagesList = images) => {
    if (index < 0 || index >= imagesList.length) return;
    
    setCurrentIndex(index);
    
    try {
      const file = imagesList[index];
      setCurrentFileId(file.id);
      
      const blob = await downloadImage(file.id, accessToken);
      const url = URL.createObjectURL(blob);
      
      setCurrentImage(url);
      setCurrentFileName(file.name);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        const containerWidth = 1320; // Max width based on layout
        const containerHeight = 660; // Max height
        
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        
        setImageScale({
          scaleX: scale,
          scaleY: scale,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
      };
      img.src = url;
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Error loading image: ' + error.message);
    }
  }, [images, accessToken]);

  const goToNext = useCallback(async () => {
    const nextIndex = getNextValidIndex(currentIndex + 1, 1);
    if (nextIndex !== null) {
      await loadImageAtIndex(nextIndex);
    } else {
      const remaining = images.length - processedIndices.size;
      if (remaining === 0 && nextPageToken) {
        await loadBatch();
      } else if (remaining === 0 && !nextPageToken) {
        return 'complete';
      }
    }
    return 'continue';
  }, [currentIndex, getNextValidIndex, loadImageAtIndex, images.length, processedIndices.size, nextPageToken, loadBatch]);

  const goToPrevious = useCallback(async () => {
    const prevIndex = getNextValidIndex(currentIndex - 1, -1);
    if (prevIndex !== null) {
      await loadImageAtIndex(prevIndex);
      return true;
    }
    return false;
  }, [currentIndex, getNextValidIndex, loadImageAtIndex]);

  const markAsProcessed = useCallback(() => {
    setProcessedIndices(prev => new Set([...prev, currentIndex]));
    setProcessedFileIds(prev => new Set([...prev, currentFileId]));
  }, [currentIndex, currentFileId]);

  const reset = useCallback(() => {
    setImages([]);
    setCurrentIndex(0);
    setProcessedIndices(new Set());
    setProcessedFileIds(new Set());
    setCurrentImage(null);
    setCurrentFileName('');
    setCurrentFileId('');
    setNextPageToken(null);
  }, []);

  return {
    images,
    currentIndex,
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
  };
}