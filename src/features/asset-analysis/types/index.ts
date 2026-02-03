import { CoinResponse } from '@/features/asset/types';

// 자산 가치 추이
export interface AssetValueTrendResponse {
  dataPoints: AssetValuePoint[];
}

export interface AssetValuePoint {
  date: string;
  totalValue: number;
  principal: number;
  profit: number;
  profitRate: number;
}

// 수익률 분포
export interface ProfitDistributionResponse {
  totalSellCount: number;
  profitCount: number;
  lossCount: number;
  winRate: number;
  averageProfitRate: number;
  averageLossRate: number;
  medianProfitRate: number;
  maxProfitRate: number;
  minProfitRate: number;
  profitRanges: ProfitRange[];
}

export interface ProfitRange {
  rangeStart: number;
  rangeEnd: number;
  count: number;
}

// 코인별 보유 현황
export interface CoinHoldingResponse {
  holdings: CoinHolding[];
  totalValue: number;
}

export interface CoinHolding {
  coin: CoinResponse | null;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  holdingValue: number;
  percentage: number;
  profit: number;
  profitRate: number;
  exchangeCode: number;
}

// 거래 빈도 분석
export interface TradingFrequencyResponse {
  hourlyFrequency: Record<number, number>;
  dayOfWeekFrequency: Record<number, number>;
  monthlyFrequency: MonthlyFrequency[];
  mostActiveHour: number | null;
  mostActiveDayOfWeek: number | null;
}

export interface MonthlyFrequency {
  year: number;
  month: number;
  count: number;
}

// (삭제됨) 거래소별 사용 패턴

// 거래 스타일 분석
export interface TradingStyleResponse {
  averageTradeAmount: number;
  medianTradeAmount: number;
  maxTradeAmount: number;
  minTradeAmount: number;
  averageHoldingPeriod: number;
  medianHoldingPeriod: number;
  tradingStyle: string;
  holdingPeriodRanges: HoldingPeriodRange[];
  tradeAmountRanges: TradeAmountRange[];
}

export interface HoldingPeriodRange {
  rangeName: string;
  count: number;
  percentage: number;
}

export interface TradeAmountRange {
  rangeName: string;
  count: number;
  percentage: number;
}

// 월별 투자 현황
export interface MonthlyInvestmentResponse {
  monthlyInvestments: MonthlyInvestment[];
}

export interface MonthlyInvestment {
  year: number;
  month: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  netInvestment: number;
  monthlyProfitRate: number;
  tradeCount: number;
}

// 최고/최저 수익 종목
export interface TopCoinResponse {
  topProfitCoins: TopCoin[];
  topLossCoins: TopCoin[];
}

export interface TopCoin {
  coin: CoinResponse | null;
  totalProfit: number;
  averageProfitRate: number;
  sellCount: number;
  exchangeCode: number | null;
}

// 심리 분석
export interface PsychologyAnalysisResponse {
  mindDistribution: Record<string, number>;
  mindAverageProfitRate: Record<string, number>;
  topTags: TagFrequency[];
}

export interface TagFrequency {
  tag: string;
  count: number;
}

// 리스크 분석
export interface RiskAnalysisResponse {
  top5CoinConcentration: number;
  topCoinConcentrations: CoinConcentration[];
  diversityIndex: number;
}

export interface CoinConcentration {
  symbol: string;
  percentage: number;
}

// 종합 성향 요약
export interface TradingTendencySummaryResponse {
  tradingStyle: string;
  riskTendency: string;
  preferredTradingHour: number | null;
  preferredTradingDay: number | null;
  preferredCoinCategories: string[];
  primaryExchange: string;
}

// 주요 지표
export interface SummaryMetrics {
  totalAssetValue: number;
  totalPrincipal: number;
  totalProfit: number;
  winRate: number;
  totalTradeCount: number;
  holdingCoinCount: number;
}

// 종합 분석 응답
export interface AssetAnalysisResponse {
  summaryMetrics: SummaryMetrics;
  assetValueTrend: AssetValueTrendResponse;
  profitDistribution: ProfitDistributionResponse;
  coinHoldings: CoinHoldingResponse;
  tradingFrequency: TradingFrequencyResponse;
  tradingStyle: TradingStyleResponse;
  monthlyInvestment: MonthlyInvestmentResponse;
  topCoins: TopCoinResponse;
  psychologyAnalysis: PsychologyAnalysisResponse;
  riskAnalysis: RiskAnalysisResponse;
  tradingTendencySummary: TradingTendencySummaryResponse;
}
