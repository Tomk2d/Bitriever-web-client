import { authenticatedFetch } from '@/lib/authenticatedFetch';

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
  profitLossRate: number | null;
  avgBuyPrice: number | null;
  createdAt: string;
  coin: CoinResponse | null;
}

export interface TradingHistoryDateRangeRequest {
  startDate: string;
  endDate: string;
}

export const tradingHistoryService = {
  getByDateRange: async (startDate: string, endDate: string): Promise<TradingHistoryResponse[]> => {
    const response = await authenticatedFetch('/api/proxy/trading-histories/range', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '매매 내역 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

