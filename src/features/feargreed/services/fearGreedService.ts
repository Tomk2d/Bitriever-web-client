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

    let result: any = {};
    try {
      result = await response.json();
    } catch (e) {
      // JSON 파싱 실패 시 빈 객체로 처리
      console.error('[fearGreedService] JSON parse error:', e);
    }

    if (!response.ok) {
      // 상태 코드에 따른 에러 메시지 제공
      let errorMessage = '공포/탐욕 지수 조회에 실패했습니다.';
      
      if (response.status === 404) {
        errorMessage = '해당 날짜의 공포/탐욕 지수 데이터가 없습니다.';
      } else if (response.status === 400) {
        errorMessage = '잘못된 날짜 형식입니다.';
      } else if (response.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다.';
      } else {
        errorMessage = result.message || result.error?.message || errorMessage;
      }
      
      console.error('[fearGreedService] Error:', {
        status: response.status,
        statusText: response.statusText,
        result,
        url: `/api/proxy/fear-greed/${date}`
      });
      
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  getHistory: async (): Promise<FearGreedResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch('/api/proxy/fear-greed/history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('공포/탐욕 지수 히스토리 조회: 인증 실패 (401) - 로그아웃 처리');
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
      throw new Error(result.message || result.error?.message || '공포/탐욕 지수 히스토리 조회에 실패했습니다.');
    }

    return result.data || [];
  },

  getToday: async (): Promise<FearGreedResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch('/api/proxy/fear-greed/today', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('공포/탐욕 지수 오늘 조회: 인증 실패 (401) - 로그아웃 처리');
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
      throw new Error(result.message || result.error?.message || '공포/탐욕 지수 오늘 조회에 실패했습니다.');
    }

    return result.data || null;
  },
};

