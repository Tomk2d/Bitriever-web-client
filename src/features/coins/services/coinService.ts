import { apiClient } from '@/lib/axios';

export interface CoinResponse {
  id: number;
  symbol: string;
  quoteCurrency: string;
  marketCode: string;
  koreanName: string | null;
  englishName: string | null;
  imgUrl: string | null;
  exchange: string;
  isActive: boolean;
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

  getAllByQuoteCurrency: async (quoteCurrency: string): Promise<CoinResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/coins/quote-currency?quoteCurrency=${encodeURIComponent(quoteCurrency)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('코인 목록 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[coinService] Error:', result);
      throw new Error(result.message || result.error?.message || '코인 목록 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

