import { CoinResponse } from './coinService';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const coinServerService = {
  getAllByQuoteCurrency: async (quoteCurrency: string, authToken?: string): Promise<CoinResponse[]> => {
    const url = `${BACKEND_URL}/api/coins/quote-currency?quoteCurrency=${encodeURIComponent(quoteCurrency)}`;
    
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

