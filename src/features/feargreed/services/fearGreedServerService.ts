import { getBackendUrl } from '@/lib/env';
import { FearGreedResponse } from './fearGreedService';

export const fearGreedServerService = {
  getHistory: async (authToken?: string): Promise<FearGreedResponse[]> => {
    const url = `${getBackendUrl()}/api/fear-greed/history`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fear-greed history: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  },
  
  getToday: async (authToken?: string): Promise<FearGreedResponse> => {
    const url = `${getBackendUrl()}/api/fear-greed/today`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch fear-greed today: ${response.status}`);
    }

    const result = await response.json();
    return result.data || null;
  },
};

