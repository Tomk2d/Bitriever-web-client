import { apiClient } from '@/lib/axios';

export interface CoinResponse {
  id: number;
  symbol: string;
  name: string;
  exchange: string;
}

export const coinService = {
  getAll: async (exchange?: string): Promise<CoinResponse[]> => {
    const params = exchange ? { exchange } : {};
    const response = await apiClient.get('/api/coins', { params });
    return response.data.data;
  },

  getById: async (id: number): Promise<CoinResponse> => {
    const response = await apiClient.get(`/api/coins/${id}`);
    return response.data.data;
  },
};

