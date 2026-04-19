import { SMA, EMA, RSI, BollingerBands, MACD } from 'technicalindicators';
import type { CandleChartRow } from './candleChartRows';

/** 1차 고정 기간 (UI 확장 시 상수만 조정) */
export const CHART_INDICATOR_PERIODS = {
  sma: 20,
  ema: 20,
  rsi: 14,
  bb: 20,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
} as const;

/** 볼린저 밴드 표준편차 배수 (일반적으로 2) */
export const CHART_BB_STD_DEV_DEFAULT = 2;

export const CHART_BB_STD_DEV_LIMITS = {
  min: 1,
  max: 4,
} as const;

/** UI·계산 공통: 기간 허용 범위 (클램프용) */
export const CHART_INDICATOR_PERIOD_LIMITS = {
  min: 2,
  max: 200,
} as const;

/** 라인 굵기 프리셋 (lightweight-charts lineWidth) */
export const CHART_INDICATOR_LINE_WIDTH_OPTIONS = [1, 2, 3, 4] as const;
export type ChartIndicatorLineWidthPreset = (typeof CHART_INDICATOR_LINE_WIDTH_OPTIONS)[number];

/** 사용자 색 미지정 시 컬러 피커 초기값 (라이트 테마 기본선에 가깝게) */
export const CHART_INDICATOR_COLOR_PICKER_SEED = {
  sma: '#5a5a5a',
  ema: '#b48200',
  rsi: '#6d28d9',
  bb: '#2563eb',
  macd: '#059669',
  macdSignal: '#f59e0b',
} as const;

export function clampIndicatorPeriod(n: number): number {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return CHART_INDICATOR_PERIODS.sma;
  return Math.min(CHART_INDICATOR_PERIOD_LIMITS.max, Math.max(CHART_INDICATOR_PERIOD_LIMITS.min, x));
}

export function clampBbStdDev(n: number): number {
  const x = Math.round(Number(n) * 2) / 2;
  if (!Number.isFinite(x)) return CHART_BB_STD_DEV_DEFAULT;
  return Math.min(CHART_BB_STD_DEV_LIMITS.max, Math.max(CHART_BB_STD_DEV_LIMITS.min, x));
}

export type IndicatorLinePoint = { time: string; value: number };

function zipAlignedSeries(candles: CandleChartRow[], values: number[]): IndicatorLinePoint[] {
  if (candles.length === 0 || values.length === 0) return [];
  const offset = candles.length - values.length;
  if (offset < 0) return [];

  const out: IndicatorLinePoint[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === undefined || Number.isNaN(Number(v))) continue;
    const row = candles[offset + i];
    if (!row) continue;
    out.push({ time: row.time, value: Number(v) });
  }
  return out;
}

export function buildSmaEmaLineData(
  candles: CandleChartRow[],
  options?: { smaPeriod?: number; emaPeriod?: number }
): {
  sma: IndicatorLinePoint[];
  ema: IndicatorLinePoint[];
} {
  if (candles.length === 0) {
    return { sma: [], ema: [] };
  }
  const smaP = clampIndicatorPeriod(options?.smaPeriod ?? CHART_INDICATOR_PERIODS.sma);
  const emaP = clampIndicatorPeriod(options?.emaPeriod ?? CHART_INDICATOR_PERIODS.ema);
  const closes = candles.map((c) => c.close);
  const smaVals = SMA.calculate({ period: smaP, values: closes });
  const emaVals = EMA.calculate({ period: emaP, values: closes });
  return {
    sma: zipAlignedSeries(candles, smaVals),
    ema: zipAlignedSeries(candles, emaVals),
  };
}

export function buildRsiLineData(candles: CandleChartRow[], rsiPeriod?: number): IndicatorLinePoint[] {
  if (candles.length === 0) return [];
  const rsiP = clampIndicatorPeriod(rsiPeriod ?? CHART_INDICATOR_PERIODS.rsi);
  const closes = candles.map((c) => c.close);
  const rsiVals = RSI.calculate({ period: rsiP, values: closes });
  return zipAlignedSeries(candles, rsiVals);
}

export function buildBollingerLineData(
  candles: CandleChartRow[],
  options?: { period?: number; stdDev?: number }
): {
  upper: IndicatorLinePoint[];
  middle: IndicatorLinePoint[];
  lower: IndicatorLinePoint[];
} {
  if (candles.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }
  const period = clampIndicatorPeriod(options?.period ?? CHART_INDICATOR_PERIODS.bb);
  const stdDev = clampBbStdDev(options?.stdDev ?? CHART_BB_STD_DEV_DEFAULT);
  const closes = candles.map((c) => c.close);
  const bands = BollingerBands.calculate({ period, values: closes, stdDev });
  const upperVals = bands.map((b) => b.upper);
  const middleVals = bands.map((b) => b.middle);
  const lowerVals = bands.map((b) => b.lower);
  return {
    upper: zipAlignedSeries(candles, upperVals),
    middle: zipAlignedSeries(candles, middleVals),
    lower: zipAlignedSeries(candles, lowerVals),
  };
}

export function buildMacdLineData(
  candles: CandleChartRow[],
  options?: { fastPeriod?: number; slowPeriod?: number; signalPeriod?: number }
): {
  macd: IndicatorLinePoint[];
  signal: IndicatorLinePoint[];
  histogram: IndicatorLinePoint[];
} {
  if (candles.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }
  const fastPeriod = clampIndicatorPeriod(options?.fastPeriod ?? CHART_INDICATOR_PERIODS.macdFast);
  const slowPeriod = clampIndicatorPeriod(options?.slowPeriod ?? CHART_INDICATOR_PERIODS.macdSlow);
  const signalPeriod = clampIndicatorPeriod(options?.signalPeriod ?? CHART_INDICATOR_PERIODS.macdSignal);
  if (fastPeriod >= slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }
  const closes = candles.map((c) => c.close);
  const rows = MACD.calculate({
    values: closes,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
  const macdVals: number[] = [];
  const signalVals: number[] = [];
  const histVals: number[] = [];
  for (const r of rows) {
    if (r.MACD === undefined || Number.isNaN(Number(r.MACD))) continue;
    macdVals.push(Number(r.MACD));
    signalVals.push(
      typeof r.signal === 'number' && !Number.isNaN(r.signal) ? Number(r.signal) : 0
    );
    histVals.push(
      typeof r.histogram === 'number' && !Number.isNaN(r.histogram) ? Number(r.histogram) : 0
    );
  }
  return {
    macd: zipAlignedSeries(candles, macdVals),
    signal: zipAlignedSeries(candles, signalVals),
    histogram: zipAlignedSeries(candles, histVals),
  };
}
