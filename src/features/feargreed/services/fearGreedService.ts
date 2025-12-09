export interface FearGreedResponse {
  id: number;
  date: string; // yyyy-MM-dd 형식
  value: number; // 0-100
}

export const fearGreedService = {
  getByDate: async (date: string): Promise<FearGreedResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/fear-greed/${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('공포/탐욕 지수 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[fearGreedService] Error:', result);
      throw new Error(result.message || result.error?.message || '공포/탐욕 지수 조회에 실패했습니다.');
    }

    return result.data || null;
  },
};

