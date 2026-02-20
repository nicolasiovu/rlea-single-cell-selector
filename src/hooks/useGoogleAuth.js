import { useState, useEffect } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive';

export function useGoogleAuth() {
  const [accessToken, setAccessToken] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  const connectDrive = () => {
    if (!isLoaded) {
      alert('Google API not loaded yet. Please try again.');
      return;
    }

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

  return { accessToken, connectDrive, isLoaded };
}