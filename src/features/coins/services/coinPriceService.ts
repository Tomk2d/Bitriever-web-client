export interface CoinPriceDayRangeRequest {
  coinId: number;
  startDate: string;
  endDate: string;
}

export interface CoinPriceDayResponse {
  id: number;
  coinId: number;
  marketCode: string;
  candleDateTimeUtc: string;
  candleDateTimeKst: string;
  openingPrice: number;
  highPrice: number;
  lowPrice: number;
  tradePrice: number;
  timestamp: number;
  candleAccTradePrice: number;
  candleAccTradeVolume: number;
  prevClosingPrice: number;
  changePrice: number;
  changeRate: number;
  convertedTradePrice: number;
  createdAt: string;
  updatedAt: string;
}

export const coinPriceService = {
  getByDateRange: async (
    coinId: number,
    startDate: string,
    endDate: string
  ): Promise<CoinPriceDayResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch('/api/proxy/coin-prices/day/range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        coinId,
        startDate,
        endDate,
      }),
    });

    if (response.status === 401) {
      console.warn('코인 가격 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[coinPriceService] Error:', result);
      throw new Error(result.message || result.error?.message || '코인 가격 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

