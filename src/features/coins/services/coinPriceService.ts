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

// WebSocket에서 받는 코인 현재가 데이터 타입
export interface CoinTickerPriceDto {
  market: string;
  tradePrice: number;
  timestamp: number;
  changePrice: number; // 전일 종가 대비 가격 변화
  changeRate: number; // 전일 종가 대비 가격 변화율 (절댓값)
  signedChangeRate: number; // 전일 종가 대비 가격 변화율 (부호 포함, 음수 가능)
  accTradePrice24h: number; // 24시간 누적 거래 금액
  [key: string]: any;
}

export const coinPriceService = {
  /**
   * 전체 코인 현재가 조회 (최초 연결 시 사용)
   * 서버에서 관리하는 모든 코인의 현재 가격을 조회
   */
  getAllTickerPrices: async (): Promise<CoinTickerPriceDto[]> => {
    const response = await fetch('/api/proxy/coin-prices/ticker/all', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '코인 가격 조회에 실패했습니다.' }));
      throw new Error(error.message || error.error?.message || '코인 가격 조회에 실패했습니다.');
    }

    const result = await response.json();
    return result.data || [];
  },

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

