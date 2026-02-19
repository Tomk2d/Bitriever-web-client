import { getBackendUrl } from '@/lib/env';
import { CoinResponse } from './coinService';

export const coinServerService = {
  getAllByQuoteCurrency: async (quoteCurrency: string, authToken?: string): Promise<CoinResponse[]> => {
    const url = `${getBackendUrl()}/api/coins/quote-currency?quoteCurrency=${encodeURIComponent(quoteCurrency)}`;
    
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
      throw new Error(`Failed to fetch coins: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  },
};

