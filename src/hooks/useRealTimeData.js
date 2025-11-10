import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useRealTimeData = (initialData, endpoint) => {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_WEBSOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to real-time updates');
    });

    socket.on(endpoint, (newData) => {
      setData(currentData => {
        // Merge new data with existing data
        const merged = [...currentData];
        newData.forEach(item => {
          const index = merged.findIndex(i => i.id === item.id);
          if (index >= 0) {
            merged[index] = { ...merged[index], ...item };
          } else {
            merged.push(item);
          }
        });
        return merged;
      });
    });

    socket.on('error', (err) => {
      setError(err);
    });

    return () => {
      socket.disconnect();
    };
  }, [endpoint]);

  return { data, isLoading, error };
}; 