import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  
  const [folders, setFolders] = useState({
    processed: null, // Source images
    output: null,    // Cropped output
    completed: null  // Where originals go when finished
  });
  
  const [images, setImages] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [processedIndices, setProcessedIndices] = useState(new Set());
  
  // Persistent label setting
  const [defaultLabel, setDefaultLabel] = useState('phytolith');

  const clearProcessingState = () => {
    setImages([]);
    setNextPageToken(null);
    setProcessedIndices(new Set());
  };

  return (
    <AppContext.Provider value={{
      accessToken, setAccessToken,
      folders, setFolders,
      images, setImages,
      nextPageToken, setNextPageToken,
      processedIndices, setProcessedIndices,
      defaultLabel, setDefaultLabel,
      clearProcessingState
    }}>
      {children}
    </AppContext.Provider>
  );
};