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
  signedChangeRate?: number; // 전일 종가 대비 가격 변화율 (부호 포함, 음수 가능)
  signedChangePrice?: number; // 전일 종가 대비 가격 변화 (부호 포함)
  accTradePrice24h: number; // 24시간 누적 거래 금액
  accTradeVolume24h?: number; // 24시간 누적 거래량
  openingPrice?: number; // 시가 (당일 캔들 open용)
  highPrice?: number; // 고가
  lowPrice?: number; // 저가
  prevClosingPrice?: number; // 전일 종가
  [key: string]: any;
}

import { authenticatedFetch } from '@/lib/authenticatedFetch';

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

  /**
   * 거래소별 코인 현재가 조회 (최초 연결 시 사용)
   * @param exchange 거래소 이름 (UPBIT, COINONE 등)
   * @returns 해당 거래소의 코인 현재 가격 목록
   */
  getTickerPricesByExchange: async (exchange: string): Promise<CoinTickerPriceDto[]> => {
    const response = await fetch(`/api/proxy/coin-prices/ticker/all?exchange=${encodeURIComponent(exchange)}`, {
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
    const response = await authenticatedFetch('/api/proxy/coin-prices/day/range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coinId,
        startDate,
        endDate,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[coinPriceService] Error:', result);
      throw new Error(result.message || result.error?.message || '코인 가격 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

