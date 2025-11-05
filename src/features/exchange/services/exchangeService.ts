import { apiClient } from '@/lib/axios';

export interface ExchangeCredentialResponse {
  id: number;
  exchange: string;
  isActive: boolean;
  createdAt: string;
}

export interface ExchangeCredentialRequest {
  exchange: string;
  apiKey: string;
  apiSecret: string;
}

export const exchangeService = {
  getAll: async (): Promise<ExchangeCredentialResponse[]> => {
    const response = await apiClient.get('/api/exchange-credentials');
    return response.data.data;
  },

  create: async (data: ExchangeCredentialRequest): Promise<ExchangeCredentialResponse> => {
    const response = await apiClient.post('/api/exchange-credentials', data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/exchange-credentials/${id}`);
  },
};

