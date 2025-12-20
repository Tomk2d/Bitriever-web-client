export type LongShortPeriod = '1h' | '4h' | '12h' | '1d';

export interface LongShortResponse {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export const longShortService = {
  getLongShortRatio: async (symbol: string, period: LongShortPeriod): Promise<LongShortResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/longshort?symbol=${encodeURIComponent(symbol)}&period=${encodeURIComponent(period)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('롱/숏 비율 조회: 인증 실패 (401) - 로그아웃 처리');
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
      console.error('[longShortService] JSON parse error:', e);
    }

    if (!response.ok) {
      let errorMessage = '롱/숏 비율 조회에 실패했습니다.';
      
      if (response.status === 404) {
        errorMessage = '해당 심볼의 롱/숏 비율 데이터가 없습니다.';
      } else if (response.status === 400) {
        errorMessage = '잘못된 요청 파라미터입니다.';
      } else if (response.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다.';
      } else {
        errorMessage = result.message || result.error?.message || errorMessage;
      }
      
      console.error('[longShortService] Error:', {
        status: response.status,
        statusText: response.statusText,
        result,
        url: `/api/proxy/longshort?symbol=${symbol}&period=${period}`
      });
      
      throw new Error(errorMessage);
    }

    return result.data || [];
  },
};

