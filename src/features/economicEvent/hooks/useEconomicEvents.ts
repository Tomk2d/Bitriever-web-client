import { useState, useEffect, useCallback } from 'react';
import { economicEventService } from '../services/economicEventService';
import { EconomicEventResponse } from '../types';

const POLLING_INTERVAL = 5 * 60 * 1000; // 5분

export const useEconomicEvents = (limit: number = 5) => {
  const [events, setEvents] = useState<EconomicEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await economicEventService.getUpcomingEvents(limit);
      setEvents(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch upcoming economic events:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch upcoming economic events'));
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchUpcomingEvents();

    const intervalId = setInterval(() => {
      fetchUpcomingEvents();
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchUpcomingEvents]);

  return { events, loading, error, refetch: fetchUpcomingEvents };
};
