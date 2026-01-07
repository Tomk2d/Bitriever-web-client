export enum EconomicIndexType {
  KOSPI = 'KOSPI',
  KOSDAQ = 'KOSDAQ',
  NASDAQ = 'NASDAQ',
  S_P_500 = 'S_P_500',
  DOW_JONES = 'DOW_JONES',
  USD_KRW = 'USD_KRW',
}

export interface EconomicIndexResponse {
  indexType: EconomicIndexType;
  // 서버에서 LocalDateTime 및 문자열 형태로 전달
  dateTime: string;
  dateTimeString: string;
  price: number;
  previousClose: number;
  // 전일 대비 등락 금액
  changeAmount: number;
  // 전일 대비 등락률 (%)
  changeRate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
  message?: string;
  timestamp?: string;
}

export interface MarketIndicator {
  label: string;
  value: string;
  change: string;
  changeValue: number;
  changeRate: number;
  type: 'positive' | 'negative';
  indexType: EconomicIndexType;
  data: EconomicIndexResponse[];
}

