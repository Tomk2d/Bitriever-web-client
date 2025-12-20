import { FearGreedResponse } from './fearGreedService';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const fearGreedServerService = {
  getHistory: async (authToken?: string): Promise<FearGreedResponse[]> => {
    const url = `${BACKEND_URL}/api/fear-greed/history`;
    
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
    const url = `${BACKEND_URL}/api/fear-greed/today`;
    
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

