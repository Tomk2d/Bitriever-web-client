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
export const selectPriceByMarket = (market: string) => (state: { coinPrice: CoinPriceState }) => 
  state.coinPrice.prices[market] || null;
export const selectTradePriceByMarket = (market: string) => (state: { coinPrice: CoinPriceState }) => 
  state.coinPrice.prices[market]?.tradePrice || 0;
export const selectIsInitialized = (state: { coinPrice: CoinPriceState }) => state.coinPrice.isInitialized;
export const selectLastUpdated = (state: { coinPrice: CoinPriceState }) => state.coinPrice.lastUpdated;

export default coinPriceSlice.reducer;

