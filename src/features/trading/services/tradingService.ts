import { apiClient } from '@/lib/axios';

export interface TradingHistoryResponse {
  id: number;
  coinId: number;
  exchange: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  totalAmount: number;
  tradedAt: string;
}

export const tradingService = {
  getAll: async (): Promise<TradingHistoryResponse[]> => {
    const response = await apiClient.get('/api/trading-histories');
    return response.data.data;
  },

  getById: async (id: number): Promise<TradingHistoryResponse> => {
    const response = await apiClient.get(`/api/trading-histories/${id}`);
    return response.data.data;
  },
};

