import { SMA, EMA, RSI } from 'technicalindicators';
import type { CandleChartRow } from './candleChartRows';

/** 1차 고정 기간 (UI 확장 시 상수만 조정) */
export const CHART_INDICATOR_PERIODS = {
  sma: 20,
  ema: 20,
  rsi: 14,
} as const;

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

export function buildSmaEmaLineData(candles: CandleChartRow[]): {
  sma: IndicatorLinePoint[];
  ema: IndicatorLinePoint[];
} {
  if (candles.length === 0) {
    return { sma: [], ema: [] };
  }
  const closes = candles.map((c) => c.close);
  const smaVals = SMA.calculate({ period: CHART_INDICATOR_PERIODS.sma, values: closes });
  const emaVals = EMA.calculate({ period: CHART_INDICATOR_PERIODS.ema, values: closes });
  return {
    sma: zipAlignedSeries(candles, smaVals),
    ema: zipAlignedSeries(candles, emaVals),
  };
}

export function buildRsiLineData(candles: CandleChartRow[]): IndicatorLinePoint[] {
  if (candles.length === 0) return [];
  const closes = candles.map((c) => c.close);
  const rsiVals = RSI.calculate({ period: CHART_INDICATOR_PERIODS.rsi, values: closes });
  return zipAlignedSeries(candles, rsiVals);
}
