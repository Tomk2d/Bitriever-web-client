import { authenticatedFetch } from '@/lib/authenticatedFetch';

export interface FearGreedResponse {
  id: number;
  date: string; // yyyy-MM-dd 형식
  value: number; // 0-100
}

export const fearGreedService = {
  getByDate: async (date: string): Promise<FearGreedResponse> => {
    const response = await authenticatedFetch(`/api/proxy/fear-greed/${date}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let result: any = {};
    try {
      result = await response.json();
    } catch (e) {
      console.error('[fearGreedService] JSON parse error:', e);
    }

    if (!response.ok) {
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
        url: `/api/proxy/fear-greed/${date}`,
      });
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  getRange: async (start: string, end: string): Promise<FearGreedResponse[]> => {
    const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const url = `/api/proxy/fear-greed/range?${qs}`;
    const response = await authenticatedFetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let result: any = {};
    try {
      result = await response.json();
    } catch (e) {
      console.error('[fearGreedService] JSON parse error:', e);
    }

    if (!response.ok) {
      let errorMessage = '공포/탐욕 지수 기간 조회에 실패했습니다.';
      if (response.status === 400) {
        errorMessage = '잘못된 날짜 형식 또는 기간 범위 오류입니다.';
      } else if (response.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다.';
      } else {
        errorMessage = result.message || result.error?.message || errorMessage;
      }
      console.error('[fearGreedService] Error:', {
        status: response.status,
        statusText: response.statusText,
        result,
        url,
      });
      throw new Error(errorMessage);
    }

    return result.data || [];
  },

  getHistory: async (): Promise<FearGreedResponse[]> => {
    const response = await authenticatedFetch('/api/proxy/fear-greed/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[fearGreedService] Error:', result);
      throw new Error(result.message || result.error?.message || '공포/탐욕 지수 히스토리 조회에 실패했습니다.');
    }
    return result.data || [];
  },

  getToday: async (): Promise<FearGreedResponse> => {
    const response = await authenticatedFetch('/api/proxy/fear-greed/today', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[fearGreedService] Error:', result);
      throw new Error(result.message || result.error?.message || '공포/탐욕 지수 오늘 조회에 실패했습니다.');
    }
    return result.data || null;
  },
};
