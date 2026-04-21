import type { CoinPriceDayResponse, CoinTickerPriceDto } from '@/features/coins/services/coinPriceService';

export type CandleChartRow = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * CoinDetail 일봉 Map + 실시간 티커를 lightweight-charts 캔들 데이터와 동일한 형태로 정렬한다.
 */
export function buildCandleChartRows(
  allChartData: Map<string, CoinPriceDayResponse>,
  endDateUtc: string,
  todayUtc: string,
  live: CoinTickerPriceDto | null
): CandleChartRow[] {
  if (allChartData.size === 0) return [];

  const endDay = endDateUtc.slice(0, 10);
  const rangeIncludesToday = endDay >= todayUtc;

  let rows: CandleChartRow[] = Array.from(allChartData.values())
    .sort((a, b) => new Date(a.candleDateTimeUtc).getTime() - new Date(b.candleDateTimeUtc).getTime())
    .map((item) => {
      const timeString = item.candleDateTimeUtc.slice(0, 10);
      const isToday = timeString === todayUtc;
      if (isToday && live) {
        const open = Number(live.openingPrice ?? live.prevClosingPrice ?? live.tradePrice);
        const high = Number(live.highPrice ?? live.tradePrice);
        const low = Number(live.lowPrice ?? live.tradePrice);
        const close = Number(live.tradePrice);
        return {
          time: timeString,
          open,
          high,
          low,
          close,
          volume: Number(item.candleAccTradeVolume ?? 0),
        };
      }
      return {
        time: timeString,
        open: Number(item.openingPrice),
        high: Number(item.highPrice),
        low: Number(item.lowPrice),
        close: Number(item.tradePrice),
        volume: Number(item.candleAccTradeVolume ?? 0),
      };
    });

  if (rangeIncludesToday && live && !rows.some((d) => d.time === todayUtc)) {
    const open = Number(live.openingPrice ?? live.prevClosingPrice ?? live.tradePrice);
    const high = Number(live.highPrice ?? live.tradePrice);
    const low = Number(live.lowPrice ?? live.tradePrice);
    const close = Number(live.tradePrice);
    rows = [...rows, { time: todayUtc, open, high, low, close, volume: 0 }].sort((a, b) => a.time.localeCompare(b.time));
  }

  return rows;
}
