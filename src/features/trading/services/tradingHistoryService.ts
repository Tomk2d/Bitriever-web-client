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

export interface TradingHistoryResponse {
  id: number;
  userId: string;
  coinId: number;
  exchangeCode: number;
  tradeUuid: string;
  tradeType: number;
  price: number;
  quantity: number;
  totalPrice: number;
  fee: number;
  tradeTime: string;
  createdAt: string;
  coin: CoinResponse | null;
}

export interface TradingHistoryDateRangeRequest {
  startDate: string;
  endDate: string;
}

export const tradingHistoryService = {
  getByDateRange: async (startDate: string, endDate: string): Promise<TradingHistoryResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    console.log('[tradingHistoryService] Requesting trading histories:', {
      startDate,
      endDate,
      hasToken: !!accessToken,
    });

    const response = await fetch('/api/proxy/trading-histories/range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    console.log('[tradingHistoryService] Response status:', response.status);

    // 401 에러 발생 시 로그아웃 처리
    if (response.status === 401) {
      console.warn('매매 내역 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[tradingHistoryService] Error:', result);
      throw new Error(result.message || result.error?.message || '매매 내역 조회에 실패했습니다.');
    }

    console.log('[tradingHistoryService] Success, data count:', result.data?.length || 0);
    return result.data || [];
  },
};

