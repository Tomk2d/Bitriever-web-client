import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CoinTickerPriceDto } from '@/features/coins/services/coinPriceService';

interface CoinPriceState {
  // market -> CoinTickerPriceDto 매핑
  prices: Record<string, CoinTickerPriceDto>;
  // 초기 데이터 로드 여부
  isInitialized: boolean;
  // 마지막 업데이트 시간
  lastUpdated: number | null;
}

const initialState: CoinPriceState = {
  prices: {},
  isInitialized: false,
  lastUpdated: null,
};

const coinPriceSlice = createSlice({
  name: 'coinPrice',
  initialState,
  reducers: {
    // 초기 데이터 설정 (최초 GET 요청 결과)
    setInitialPrices: (state, action: PayloadAction<CoinTickerPriceDto[]>) => {
      const priceMap: Record<string, CoinTickerPriceDto> = {};
      action.payload.forEach((coin) => {
        if (coin.market) {
          priceMap[coin.market] = coin;
        }
      });
      state.prices = priceMap;
      state.isInitialized = true;
      state.lastUpdated = Date.now();
    },
    // WebSocket으로 받은 변동 가격 업데이트
    updatePrices: (state, action: PayloadAction<CoinTickerPriceDto[]>) => {
      action.payload.forEach((coin) => {
        if (coin.market) {
          state.prices[coin.market] = coin;
        }
      });
      state.lastUpdated = Date.now();
    },
    // 특정 마켓의 가격만 업데이트
    updatePrice: (state, action: PayloadAction<CoinTickerPriceDto>) => {
      if (action.payload.market) {
        state.prices[action.payload.market] = action.payload;
        state.lastUpdated = Date.now();
      }
    },
    // 가격 초기화
    clearPrices: (state) => {
      state.prices = {};
      state.isInitialized = false;
      state.lastUpdated = null;
    },
  },
});

export const { setInitialPrices, updatePrices, updatePrice, clearPrices } = coinPriceSlice.actions;

// Selectors
export const selectAllPrices = (state: { coinPrice: CoinPriceState }) => state.coinPrice.prices;

// 대소문자 무시하여 가격 조회 (코인원의 경우 market이 소문자, marketCode가 대문자일 수 있음)
export const selectPriceByMarket = (market: string) => (state: { coinPrice: CoinPriceState }) => {
  if (!market) return null;
  
  // 정확한 매칭 시도
  if (state.coinPrice.prices[market]) {
    return state.coinPrice.prices[market];
  }
  
  // 대소문자 무시 매칭 시도 (소문자, 대문자, 원본 순서로 시도)
  const marketLower = market.toLowerCase();
  const marketUpper = market.toUpperCase();
  
  // 소문자로 시도
  if (state.coinPrice.prices[marketLower]) {
    return state.coinPrice.prices[marketLower];
  }
  
  // 대문자로 시도
  if (state.coinPrice.prices[marketUpper]) {
    return state.coinPrice.prices[marketUpper];
  }
  
  // 모든 키를 순회하면서 대소문자 무시 비교 (fallback)
  for (const [key, value] of Object.entries(state.coinPrice.prices)) {
    if (key.toLowerCase() === marketLower) {
      return value;
    }
  }
  
  return null;
};

export const selectTradePriceByMarket = (market: string) => (state: { coinPrice: CoinPriceState }) => 
  selectPriceByMarket(market)(state)?.tradePrice || 0;
export const selectIsInitialized = (state: { coinPrice: CoinPriceState }) => state.coinPrice.isInitialized;
export const selectLastUpdated = (state: { coinPrice: CoinPriceState }) => state.coinPrice.lastUpdated;

export default coinPriceSlice.reducer;

