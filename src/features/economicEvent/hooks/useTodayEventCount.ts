import { useState, useEffect, useCallback } from 'react';
import { economicEventService } from '../services/economicEventService';

const POLLING_INTERVAL = 5 * 60 * 1000; // 5분

export const useTodayEventCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTodayEventCount = useCallback(async () => {
    try {
      setError(null);
      const data = await economicEventService.getTodayEventCount();
      setCount(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch today event count:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch today event count'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayEventCount();

    const intervalId = setInterval(() => {
      fetchTodayEventCount();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchTodayEventCount]);

  return { count, loading, error, refetch: fetchTodayEventCount };
};
