import { apiClient } from '@/lib/axios';

export interface DiaryRequest {
  tradingHistoryId: number;
  content: string;
  tags?: string[];
}

export interface DiaryResponse {
  id: number;
  tradingHistoryId: number;
  content: string;
  tags?: string[];
  tradingMind?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export const diaryService = {
  getAll: async (): Promise<DiaryResponse[]> => {
    const response = await apiClient.get('/api/diaries/user');
    return response.data.data;
  },

  getById: async (id: number): Promise<DiaryResponse> => {
    const response = await apiClient.get(`/api/diaries/${id}`);
    return response.data.data;
  },

  create: async (data: DiaryRequest): Promise<DiaryResponse> => {
    const response = await apiClient.post('/api/diaries', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<DiaryRequest>): Promise<DiaryResponse> => {
    const response = await apiClient.put(`/api/diaries/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/diaries/${id}`);
  },

  getByTradingHistoryId: async (tradingHistoryId: number): Promise<DiaryResponse | null> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/diaries/trading-history/${tradingHistoryId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    // 401 에러 발생 시 로그아웃 처리
    if (response.status === 401) {
      console.warn('매매일지 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    // 404 에러는 일지가 없는 것이므로 정상적인 경우로 처리
    if (response.status === 404) {
      return null;
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[diaryService] Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '매매일지 조회에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },
};

