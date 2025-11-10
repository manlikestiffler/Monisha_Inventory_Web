import { useState, useEffect, useCallback } from 'react';

export const useRealtimeUpdates = (initialData, endpoint) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, this would be an API call to 'endpoint'
      // For now, we'll just simulate a fetch with initialData
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(initialData);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Simulate real-time updates with polling
  useEffect(() => {
    const interval = setInterval(() => {
      setData(currentData => ({
        ...currentData,
        // Example of a small, random update
        revenueStats: {
          ...currentData.revenueStats,
          total: currentData.revenueStats.total + Math.floor(Math.random() * 100),
        }
      }));
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { 
    data,
    loading,
    error,
    refresh: fetchData // Expose a refresh function
  };
}; 