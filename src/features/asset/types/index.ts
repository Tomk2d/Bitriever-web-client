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

export interface AssetResponse {
  id: number;
  exchangeCode: number;
  coinId: number | null;
  symbol: string;
  tradeBySymbol: string;
  quantity: number;
  lockedQuantity: number;
  avgBuyPrice: number;
  avgBuyPriceModified: boolean;
  createdAt: string;
  updatedAt: string;
  coin: CoinResponse | null;
}

