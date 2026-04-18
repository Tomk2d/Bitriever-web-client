'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  TickMarkType,
  type Time,
} from 'lightweight-charts';
import { coinPriceService, CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { getTodayUtcString } from '@/shared/utils/dateUtils';
import { buildCandleChartRows } from '@/features/coins/utils/candleChartRows';
import { buildRsiLineData, buildSmaEmaLineData } from '@/features/coins/utils/chartTechnicalIndicators';

interface CoinDetailCandleChartProps {
  coinId: number;
  marketCode: string;
  containerClassName?: string;
  onDateClick?: (dateData: CoinPriceDayResponse | null) => void;
  /** SMA·EMA(20) 오버레이 표시 */
  showSmaEma?: boolean;
  /** RSI(14) 보조 패널 표시 */
  showRsi?: boolean;
}

type IndicatorLegendSnapshot = {
  sma: number | null;
  ema: number | null;
  rsi: number | null;
};

type HoverLegendState = {
  active: boolean;
  sma: number | null;
  ema: number | null;
  rsi: number | null;
};

const MIN_DATE = new Date('2017-01-01T00:00:00');
const RSI_PANE_RATIO = 0.21;

function isValidTimePoint(t: unknown): boolean {
  if (t === null || t === undefined) return false;
  if (typeof t === 'string' || typeof t === 'number') return true;
  if (typeof t === 'object' && t !== null && 'year' in t && 'month' in t && 'day' in t) {
    const b = t as { year: unknown; month: unknown; day: unknown };
    return (
      typeof b.year === 'number' &&
      typeof b.month === 'number' &&
      typeof b.day === 'number' &&
      Number.isFinite(b.year) &&
      Number.isFinite(b.month) &&
      Number.isFinite(b.day)
    );
  }
  return false;
}

function hasValidTimeRange(
  range: { from: unknown; to: unknown } | null | undefined
): range is { from: string | number | { year: number; month: number; day: number }; to: string | number | { year: number; month: number; day: number } } {
  return !!range && isValidTimePoint(range.from) && isValidTimePoint(range.to);
}

function safeSetVisibleRange(
  chart: IChartApi | null,
  range: { from: unknown; to: unknown } | null | undefined
): void {
  if (!chart || !hasValidTimeRange(range)) return;
  try {
    chart.timeScale().setVisibleRange({ from: range.from as Time, to: range.to as Time });
  } catch {
    /* setData 등으로 시계열이 재구성되는 순간 null 범위가 들어오는 경우 무시 */
  }
}

function toTimeKey(time: Time): string {
  if (typeof time === 'string') return time.slice(0, 10);
  if (typeof time === 'number') {
    const d = new Date(time < 1e12 ? time * 1000 : time);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
}

function lastLineValue(points: Array<{ value: number }>): number | null {
  if (points.length === 0) return null;
  const v = points[points.length - 1]?.value;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildWhitespaceTimes(rows: Array<{ time: string }>, padDays = 40): string[] {
  if (rows.length === 0) {
    const today = new Date();
    const out: string[] = [];
    for (let i = -60; i <= 60; i++) out.push(toDateKey(addDays(today, i)));
    return out;
  }
  const first = new Date(`${rows[0].time}T00:00:00`);
  const last = new Date(`${rows[rows.length - 1].time}T00:00:00`);
  const out: string[] = [];
  for (let i = padDays; i >= 1; i--) out.push(toDateKey(addDays(first, -i)));
  for (let i = 1; i <= padDays; i++) out.push(toDateKey(addDays(last, i)));
  return out;
}

function buildPaddedCandleRows<T extends { time: string }>(rows: T[], padDays = 40): Array<T | { time: string }> {
  if (rows.length === 0) return buildWhitespaceTimes([], padDays).map((time) => ({ time }));
  const first = new Date(`${rows[0].time}T00:00:00`);
  const last = new Date(`${rows[rows.length - 1].time}T00:00:00`);
  const before = Array.from({ length: padDays }, (_, i) => ({ time: toDateKey(addDays(first, -(padDays - i))) }));
  const after = Array.from({ length: padDays }, (_, i) => ({ time: toDateKey(addDays(last, i + 1)) }));
  return [...before, ...rows, ...after];
}

/**
 * 상·하단 스택의 우측 가격축 너비를 동일하게 맞춤.
 * minimumWidth는 라벨이 더 넓으면 그만큼 초과될 수 있어(문서), RSI 소수 자릿수 등으로
 * 한쪽만 넓어지지 않도록 양쪽 실측 중 큰 값을 둘 다에 적용한다.
 */
function syncStackedRightPriceScales(main: IChartApi | null, rsi: IChartApi | null): void {
  if (!main || !rsi) return;
  const wMain = main.priceScale('right').width();
  const wRsi = rsi.priceScale('right').width();
  const w = Math.max(wMain, wRsi);
  if (w > 0) {
    main.priceScale('right').applyOptions({ minimumWidth: w });
    rsi.priceScale('right').applyOptions({ minimumWidth: w });
  }
}

export default function CoinDetailCandleChart({
  coinId,
  marketCode,
  containerClassName = '',
  onDateClick,
  showSmaEma = true,
  showRsi = true,
}: CoinDetailCandleChartProps) {
  const chartStackRef = useRef<HTMLDivElement>(null);
  const mainPaneRef = useRef<HTMLDivElement>(null);
  const rsiPaneRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiMidZoneRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);

  const timeSyncLockRef = useRef<'off' | 'main' | 'rsi'>('off');
  const timeUnsubMainRef = useRef<(() => void) | null>(null);
  const timeUnsubRsiRef = useRef<(() => void) | null>(null);
  const crosshairSyncLockRef = useRef<'off' | 'main' | 'rsi'>('off');
  const crosshairUnsubMainRef = useRef<(() => void) | null>(null);
  const crosshairUnsubRsiRef = useRef<(() => void) | null>(null);
  const didInitialFitRef = useRef(false);
  const closeByTimeRef = useRef<Map<string, number>>(new Map());
  const smaByTimeRef = useRef<Map<string, number>>(new Map());
  const emaByTimeRef = useRef<Map<string, number>>(new Map());
  const rsiByTimeRef = useRef<Map<string, number>>(new Map());
  /** setData 등으로 메인 시계열이 갱신되는 동안 교차 setVisibleRange 호출 방지 */
  const suppressTimeRangeSyncRef = useRef(false);
  const showRsiRef = useRef(showRsi);
  showRsiRef.current = showRsi;

  const loadedRangesRef = useRef<Set<string>>(new Set());
  const loadingRangesRef = useRef<Set<string>>(new Set());
  const pendingRangesRef = useRef<Set<string>>(new Set());
  const earliestLoadedDateRef = useRef<Date | null>(null);
  const endReachedRef = useRef<boolean>(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [indicatorLegend, setIndicatorLegend] = useState<IndicatorLegendSnapshot>({
    sma: null,
    ema: null,
    rsi: null,
  });
  const [hoverLegend, setHoverLegend] = useState<HoverLegendState>({
    active: false,
    sma: null,
    ema: null,
    rsi: null,
  });

  const setIndicatorLegendSafe = useCallback((next: IndicatorLegendSnapshot) => {
    setIndicatorLegend((prev) =>
      prev.sma === next.sma && prev.ema === next.ema && prev.rsi === next.rsi ? prev : next
    );
  }, []);

  const setHoverLegendSafe = useCallback((next: HoverLegendState) => {
    setHoverLegend((prev) =>
      prev.active === next.active && prev.sma === next.sma && prev.ema === next.ema && prev.rsi === next.rsi
        ? prev
        : next
    );
  }, []);

  const priceData = useAppSelector(selectPriceByMarket(marketCode));
  const currentPrice = priceData?.tradePrice || null;

  const getDateRangeKey = useCallback((from: Date, to: Date): string => {
    return `${from.toISOString()}_${to.toISOString()}`;
  }, []);

  const getInitialDateRange = useCallback(() => {
    const now = new Date();
    const initialStartDate = MIN_DATE.toISOString().split('T')[0] + 'T00:00:00';
    earliestLoadedDateRef.current = MIN_DATE;
    return {
      startDate: initialStartDate,
      endDate: now.toISOString().split('T')[0] + 'T23:59:59',
    };
  }, []);

  const [dateRange] = useState(getInitialDateRange());

  const rangeKeyForQuery = useMemo(() => {
    return getDateRangeKey(new Date(dateRange.startDate), new Date(dateRange.endDate));
  }, [dateRange.startDate, dateRange.endDate, getDateRangeKey]);

  useEffect(() => {
    if (coinId) {
      didInitialFitRef.current = false;
      const initialRangeKey = rangeKeyForQuery;
      if (
        !loadedRangesRef.current.has(initialRangeKey) &&
        !loadingRangesRef.current.has(initialRangeKey) &&
        !pendingRangesRef.current.has(initialRangeKey)
      ) {
        pendingRangesRef.current.add(initialRangeKey);
      }
    }
  }, [coinId, rangeKeyForQuery]);

  const shouldEnableQuery = useMemo(() => {
    if (!coinId) return false;
    const key = rangeKeyForQuery;
    return pendingRangesRef.current.has(key) || !loadedRangesRef.current.has(key);
  }, [coinId, rangeKeyForQuery]);

  const { data: priceDataList = [], isLoading } = useQuery<CoinPriceDayResponse[]>({
    queryKey: ['coin-price-day-range', coinId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const key = rangeKeyForQuery;
      pendingRangesRef.current.delete(key);
      loadingRangesRef.current.add(key);
      try {
        return await coinPriceService.getByDateRange(coinId, dateRange.startDate, dateRange.endDate);
      } finally {
        loadingRangesRef.current.delete(key);
      }
    },
    enabled: shouldEnableQuery,
    staleTime: 1000 * 60 * 5,
  });

  const allChartData = useRef<Map<string, CoinPriceDayResponse>>(new Map());

  const syncSeriesFromMap = useCallback(() => {
    const candleSeries = seriesRef.current;
    if (!mainChartRef.current || !candleSeries) return;

    const todayUtc = getTodayUtcString();
    const endDateUtc = dateRange.endDate.slice(0, 10);
    const rows =
      allChartData.current.size > 0
        ? buildCandleChartRows(allChartData.current, endDateUtc, todayUtc, priceData ?? null)
        : [];
    const paddedCandleRows = buildPaddedCandleRows(rows);
    const paddedVolumeRows = buildPaddedCandleRows(
      rows.map((row) => ({
        time: row.time,
        value: row.volume,
        color: row.close >= row.open ? 'rgba(221, 60, 68, 0.22)' : 'rgba(19, 117, 236, 0.22)',
      }))
    );
    closeByTimeRef.current = new Map(rows.map((row) => [row.time, row.close]));
    const { sma, ema } = buildSmaEmaLineData(rows);
    const rsiData = buildRsiLineData(rows);
    smaByTimeRef.current = new Map(sma.map((p) => [p.time, p.value]));
    emaByTimeRef.current = new Map(ema.map((p) => [p.time, p.value]));
    rsiByTimeRef.current = new Map(rsiData.map((p) => [p.time, p.value]));
    setIndicatorLegendSafe({
      sma: showSmaEma ? lastLineValue(sma) : null,
      ema: showSmaEma ? lastLineValue(ema) : null,
      rsi: showRsi ? lastLineValue(rsiData) : null,
    });

    suppressTimeRangeSyncRef.current = true;
    try {
      candleSeries.setData(paddedCandleRows);
      volumeSeriesRef.current?.setData(paddedVolumeRows);

      if (smaLineRef.current && emaLineRef.current) {
        if (showSmaEma) {
          smaLineRef.current.setData(sma);
          emaLineRef.current.setData(ema);
        } else {
          smaLineRef.current.setData([]);
          emaLineRef.current.setData([]);
        }
      }

      if (rsiLineRef.current && rsiChartRef.current) {
        if (showRsi) {
          const paddedRsiData = buildPaddedCandleRows(rsiData);
          const paddedMidZone = buildPaddedCandleRows(rows.map((row) => ({ time: row.time, value: 70 })));
          rsiLineRef.current.setData(paddedRsiData);
          rsiMidZoneRef.current?.setData(paddedMidZone);
        } else {
          rsiLineRef.current.setData([]);
          rsiByTimeRef.current = new Map();
          rsiMidZoneRef.current?.setData([]);
        }
      }
    } finally {
      suppressTimeRangeSyncRef.current = false;
    }

    if (showRsi && rsiChartRef.current && mainChartRef.current) {
      requestAnimationFrame(() => {
        const main = mainChartRef.current;
        const rsi = rsiChartRef.current;
        if (!main || !rsi || !showRsiRef.current) return;
        const range = main.timeScale().getVisibleRange();
        timeSyncLockRef.current = 'main';
        try {
          safeSetVisibleRange(rsi, range);
        } finally {
          timeSyncLockRef.current = 'off';
        }
        syncStackedRightPriceScales(main, rsi);
      });
    }

    if (!didInitialFitRef.current && mainChartRef.current) {
      didInitialFitRef.current = true;
      requestAnimationFrame(() => {
        const main = mainChartRef.current;
        const rsi = rsiChartRef.current;
        if (!main) return;
        main.timeScale().fitContent();
        main.timeScale().scrollToRealTime();
        if (showRsi && rsi) {
          rsi.timeScale().fitContent();
          rsi.timeScale().scrollToRealTime();
          syncStackedRightPriceScales(main, rsi);
        }
      });
    }
  }, [dateRange.endDate, priceData, setIndicatorLegendSafe, showSmaEma, showRsi]);

  useEffect(() => {
    if (!isLoading && priceDataList && priceDataList.length > 0) {
      const rangeKey = getDateRangeKey(new Date(dateRange.startDate), new Date(dateRange.endDate));

      priceDataList.forEach((item) => {
        const timeString = item.candleDateTimeUtc.slice(0, 10);
        allChartData.current.set(timeString, item);
      });

      const requestStartDate = new Date(dateRange.startDate);
      if (!earliestLoadedDateRef.current || requestStartDate < earliestLoadedDateRef.current) {
        earliestLoadedDateRef.current = requestStartDate;
      }
      endReachedRef.current = false;

      loadedRangesRef.current.add(rangeKey);
      loadingRangesRef.current.delete(rangeKey);
      pendingRangesRef.current.delete(rangeKey);
    } else if (!isLoading && priceDataList && priceDataList.length === 0) {
      const rangeKey = getDateRangeKey(new Date(dateRange.startDate), new Date(dateRange.endDate));
      const requestStartDate = new Date(dateRange.startDate);
      if (!earliestLoadedDateRef.current || requestStartDate < earliestLoadedDateRef.current) {
        earliestLoadedDateRef.current = requestStartDate;
        endReachedRef.current = true;
      }
      loadedRangesRef.current.add(rangeKey);
      loadingRangesRef.current.delete(rangeKey);
      pendingRangesRef.current.delete(rangeKey);
    }

    syncSeriesFromMap();
  }, [priceDataList, dateRange, isLoading, priceData, syncSeriesFromMap]);

  const checkAndLoadData = useCallback((_visibleFrom: Date, _visibleTo: Date) => {
    // 일봉 전구간 초기 로드만 사용
  }, []);

  const clearTimeSync = useCallback(() => {
    timeUnsubMainRef.current?.();
    timeUnsubRsiRef.current?.();
    crosshairUnsubMainRef.current?.();
    crosshairUnsubRsiRef.current?.();
    timeUnsubMainRef.current = null;
    timeUnsubRsiRef.current = null;
    crosshairUnsubMainRef.current = null;
    crosshairUnsubRsiRef.current = null;
  }, []);

  const setupTimeSync = useCallback(() => {
    clearTimeSync();
    const main = mainChartRef.current;
    const rsi = rsiChartRef.current;
    if (!main || !rsi || !showRsi) return;

    const onMain = () => {
      if (suppressTimeRangeSyncRef.current) return;
      if (timeSyncLockRef.current === 'rsi') return;
      if (!showRsiRef.current) return;
      const mainLive = mainChartRef.current;
      const rsiLive = rsiChartRef.current;
      if (!mainLive || !rsiLive) return;
      const range = mainLive.timeScale().getVisibleRange();
      if (!hasValidTimeRange(range)) return;
      timeSyncLockRef.current = 'main';
      try {
        safeSetVisibleRange(rsiLive, range);
      } finally {
        timeSyncLockRef.current = 'off';
      }
      syncStackedRightPriceScales(mainLive, rsiLive);
    };

    const onRsi = () => {
      if (suppressTimeRangeSyncRef.current) return;
      if (timeSyncLockRef.current === 'main') return;
      if (!showRsiRef.current) return;
      const mainLive = mainChartRef.current;
      const rsiLive = rsiChartRef.current;
      if (!mainLive || !rsiLive) return;
      const range = rsiLive.timeScale().getVisibleRange();
      if (!hasValidTimeRange(range)) return;
      timeSyncLockRef.current = 'rsi';
      try {
        safeSetVisibleRange(mainLive, range);
      } finally {
        timeSyncLockRef.current = 'off';
      }
    };

    main.timeScale().subscribeVisibleTimeRangeChange(onMain);
    rsi.timeScale().subscribeVisibleTimeRangeChange(onRsi);
    timeUnsubMainRef.current = () => main.timeScale().unsubscribeVisibleTimeRangeChange(onMain);
    timeUnsubRsiRef.current = () => rsi.timeScale().unsubscribeVisibleTimeRangeChange(onRsi);

    const onMainCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      if (suppressTimeRangeSyncRef.current) return;
      if (crosshairSyncLockRef.current === 'rsi') return;
      const mainLive = mainChartRef.current;
      const rsiLive = rsiChartRef.current;
      const candleSeriesLive = seriesRef.current;
      const rsiSeriesLive = rsiLineRef.current;
      if (!mainLive || !rsiLive || !candleSeriesLive || !rsiSeriesLive || !showRsiRef.current) return;

      if (param.time === undefined) {
        setHoverLegendSafe({ active: false, sma: null, ema: null, rsi: null });
        crosshairSyncLockRef.current = 'main';
        try {
          rsiLive.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      const timeKey = toTimeKey(param.time);
      setHoverLegendSafe({
        active: true,
        sma: showSmaEma ? (smaByTimeRef.current.get(timeKey) ?? null) : null,
        ema: showSmaEma ? (emaByTimeRef.current.get(timeKey) ?? null) : null,
        rsi: showRsi ? (rsiByTimeRef.current.get(timeKey) ?? null) : null,
      });
      const rsiPrice = rsiByTimeRef.current.get(timeKey);
      if (typeof rsiPrice !== 'number') {
        crosshairSyncLockRef.current = 'main';
        try {
          rsiLive.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      crosshairSyncLockRef.current = 'main';
      try {
        try {
          rsiLive.setCrosshairPosition(rsiPrice, param.time, rsiSeriesLive);
        } catch {
          rsiLive.clearCrosshairPosition();
        }
      } finally {
        crosshairSyncLockRef.current = 'off';
      }
    };

    const onRsiCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      if (suppressTimeRangeSyncRef.current) return;
      if (crosshairSyncLockRef.current === 'main') return;
      const mainLive = mainChartRef.current;
      const rsiLive = rsiChartRef.current;
      const candleSeriesLive = seriesRef.current;
      const rsiSeriesLive = rsiLineRef.current;
      if (!mainLive || !rsiLive || !candleSeriesLive || !rsiSeriesLive || !showRsiRef.current) return;

      if (param.time === undefined) {
        setHoverLegendSafe({ active: false, sma: null, ema: null, rsi: null });
        crosshairSyncLockRef.current = 'rsi';
        try {
          mainLive.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      const timeKey = toTimeKey(param.time);
      setHoverLegendSafe({
        active: true,
        sma: showSmaEma ? (smaByTimeRef.current.get(timeKey) ?? null) : null,
        ema: showSmaEma ? (emaByTimeRef.current.get(timeKey) ?? null) : null,
        rsi: showRsi ? (rsiByTimeRef.current.get(timeKey) ?? null) : null,
      });
      const closePrice = closeByTimeRef.current.get(timeKey);
      if (typeof closePrice !== 'number') {
        crosshairSyncLockRef.current = 'rsi';
        try {
          mainLive.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      crosshairSyncLockRef.current = 'rsi';
      try {
        try {
          mainLive.setCrosshairPosition(closePrice, param.time, candleSeriesLive);
        } catch {
          mainLive.clearCrosshairPosition();
        }
      } finally {
        crosshairSyncLockRef.current = 'off';
      }
    };

    main.subscribeCrosshairMove(onMainCrosshair);
    rsi.subscribeCrosshairMove(onRsiCrosshair);
    crosshairUnsubMainRef.current = () => main.unsubscribeCrosshairMove(onMainCrosshair);
    crosshairUnsubRsiRef.current = () => rsi.unsubscribeCrosshairMove(onRsiCrosshair);
  }, [clearTimeSync, setHoverLegendSafe, showRsi, showSmaEma]);

  useEffect(() => {
    const outer = chartStackRef.current;
    if (!outer) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== outer) continue;
        const { width, height } = entry.contentRect;
        const w = Math.round(width);
        const h = Math.round(height);
        setContainerSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
        break;
      }
    });
    ro.observe(outer);
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!chartStackRef.current) return;
        const w = Math.round(chartStackRef.current.clientWidth);
        const h = Math.round(chartStackRef.current.clientHeight);
        if (w > 0 && h > 0) {
          setContainerSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
        }
      });
    });
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const outer = chartStackRef.current;
    const mainPane = mainPaneRef.current;
    if (!outer || !mainPane) return;

    const width = containerSize.width || outer.clientWidth;
    const height = containerSize.height || outer.clientHeight;
    if (width === 0 || height === 0) return;

    const mainH = showRsi ? Math.max(Math.floor(height * (1 - RSI_PANE_RATIO)), 1) : height;
    const rsiH = showRsi ? Math.max(height - mainH, 1) : 0;

    const getCSSVariable = (variableName: string, defaultValue: string): string => {
      if (typeof window === 'undefined') return defaultValue;
      const computedStyle = getComputedStyle(outer);
      const value = computedStyle.getPropertyValue(variableName).trim();
      return value || defaultValue;
    };

    const foregroundColor = getCSSVariable('--foreground', '#171717');
    const priceUpColor = getCSSVariable('--price-up', '#dd3c44');
    const priceDownColor = getCSSVariable('--price-down', '#1375ec');
    const isDarkMode = outer.closest('.dark') !== null;
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const formatPrice = (price: number): string => {
      if (Math.abs(price) < 100) {
        return new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(price);
      }
      return new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
    };

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formatTimeLabel = (time: Time): string => {
      if (typeof time === 'string') {
        return formatDate(new Date(time));
      }
      if (typeof time === 'number') {
        return formatDate(new Date(time < 1e12 ? time * 1000 : time));
      }
      return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
    };

    const tickMarkFormatter = (time: string | number, _tickMarkType: TickMarkType, _locale: string) => {
      return formatTimeLabel(time as Time);
    };

    if (!mainChartRef.current) {
      const chart = createChart(mainPane, {
        width,
        height: mainH,
        layout: {
          background: { color: 'transparent' },
          textColor: foregroundColor,
          fontSize: 9,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: {
          borderColor,
          // 캔들 영역을 더 꽉 차게 사용(거래량과 일부 겹침 허용)
          scaleMargins: { top: 0.08, bottom: 0.10 },
        },
        timeScale: {
          borderColor,
          visible: !showRsi,
          timeVisible: true,
          tickMarkFormatter,
          rightOffset: 12,
          fixLeftEdge: false,
          fixRightEdge: false,
          shiftVisibleRangeOnNewBar: false,
          allowShiftVisibleRangeOnWhitespaceReplacement: true,
        },
        localization: {
          timeFormatter: formatTimeLabel,
        },
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 2,
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: false,
          },
          horzLine: {
            visible: false,
            labelVisible: false,
            style: 2,
          },
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          pinch: true,
          mouseWheel: true,
          axisDoubleClickReset: true,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: priceUpColor,
        downColor: priceDownColor,
        borderVisible: false,
        wickUpColor: priceUpColor,
        wickDownColor: priceDownColor,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (p: number) => formatPrice(p),
        },
      });
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: '',
        priceLineVisible: false,
        lastValueVisible: false,
      });
      volumeSeries.priceScale().applyOptions({
        // 거래량 영역을 위로 올려 캔들 영역과 겹치게 배치(중간 텀 제거)
        scaleMargins: { top: 0.85, bottom: 0.02 },
      });

      const smaColor = isDarkMode ? 'rgba(200, 200, 200, 0.85)' : 'rgba(90, 90, 90, 0.9)';
      const emaColor = isDarkMode ? 'rgba(250, 204, 21, 0.9)' : 'rgba(180, 130, 0, 0.95)';

      const smaSeries = chart.addLineSeries({
        color: smaColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showSmaEma,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      const emaSeries = chart.addLineSeries({
        color: emaColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showSmaEma,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });

      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (!timeRange) return;
        const from =
          typeof timeRange.from === 'string'
            ? new Date(timeRange.from)
            : new Date((timeRange.from as number) * 1000);
        const to =
          typeof timeRange.to === 'string'
            ? new Date(timeRange.to)
            : new Date((timeRange.to as number) * 1000);
        checkAndLoadData(from, to);
      });

      mainChartRef.current = chart;
      seriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      smaLineRef.current = smaSeries;
      emaLineRef.current = emaSeries;

      if (allChartData.current.size > 0) {
        const todayUtc = getTodayUtcString();
        const endDateUtc = dateRange.endDate.slice(0, 10);
        const rows = buildCandleChartRows(allChartData.current, endDateUtc, todayUtc, priceData ?? null);
        candlestickSeries.setData(buildPaddedCandleRows(rows));
        volumeSeries.setData(
          buildPaddedCandleRows(
            rows.map((row) => ({
              time: row.time,
              value: row.volume,
              color: row.close >= row.open ? 'rgba(221, 60, 68, 0.22)' : 'rgba(19, 117, 236, 0.22)',
            }))
          )
        );
        if (showSmaEma) {
          const { sma, ema } = buildSmaEmaLineData(rows);
          smaSeries.setData(sma);
          emaSeries.setData(ema);
        }
      }
    }

    if (showRsi && rsiPaneRef.current && !rsiChartRef.current) {
      const rsiPane = rsiPaneRef.current;
      const rsiColor = isDarkMode ? 'rgba(167, 139, 250, 0.88)' : 'rgba(109, 40, 217, 0.78)';
      const rsiChart = createChart(rsiPane, {
        width,
        height: rsiH,
        layout: {
          background: { color: 'transparent' },
          textColor: foregroundColor,
          fontSize: 9,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: {
          borderColor,
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor,
          visible: true,
          timeVisible: true,
          tickMarkFormatter,
          rightOffset: 12,
          fixLeftEdge: false,
          fixRightEdge: false,
          shiftVisibleRangeOnNewBar: false,
          allowShiftVisibleRangeOnWhitespaceReplacement: true,
        },
        localization: {
          timeFormatter: formatTimeLabel,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            visible: true,
            style: 2,
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: true,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            style: 2,
          },
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          pinch: true,
          mouseWheel: true,
          axisDoubleClickReset: true,
        },
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: rsiColor,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(2) },
      });
      const rsiMidZone = rsiChart.addBaselineSeries({
        baseValue: { type: 'price', price: 30 },
        topFillColor1: isDarkMode ? 'rgba(167, 139, 250, 0.14)' : 'rgba(109, 40, 217, 0.08)',
        topFillColor2: isDarkMode ? 'rgba(167, 139, 250, 0.14)' : 'rgba(109, 40, 217, 0.08)',
        bottomFillColor1: 'rgba(0, 0, 0, 0)',
        bottomFillColor2: 'rgba(0, 0, 0, 0)',
        topLineColor: 'rgba(0, 0, 0, 0)',
        bottomLineColor: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        lineVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });

      rsiChartRef.current = rsiChart;
      rsiLineRef.current = rsiSeries;
      rsiMidZoneRef.current = rsiMidZone;

      if (allChartData.current.size > 0) {
        const todayUtc = getTodayUtcString();
        const endDateUtc = dateRange.endDate.slice(0, 10);
        const rows = buildCandleChartRows(allChartData.current, endDateUtc, todayUtc, priceData ?? null);
        const rsiData = buildRsiLineData(rows);
        closeByTimeRef.current = new Map(rows.map((row) => [row.time, row.close]));
        rsiByTimeRef.current = new Map(rsiData.map((p) => [p.time, p.value]));
        rsiSeries.setData(buildPaddedCandleRows(rsiData));
        rsiMidZone.setData(buildPaddedCandleRows(rows.map((row) => ({ time: row.time, value: 70 }))));
      }

      const vr = mainChartRef.current?.timeScale().getVisibleRange();
      timeSyncLockRef.current = 'main';
      try {
        safeSetVisibleRange(rsiChart, vr);
      } finally {
        timeSyncLockRef.current = 'off';
      }
    }

    if (!showRsi && rsiChartRef.current) {
      clearTimeSync();
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
      rsiLineRef.current = null;
      rsiMidZoneRef.current = null;
      rsiByTimeRef.current = new Map();
    }

    const mainChart = mainChartRef.current;
    const rsiChart = rsiChartRef.current;
    const dark = outer.closest('.dark') !== null;

    if (mainChart && seriesRef.current) {
      mainChart.applyOptions({ width, height: mainH });
      mainChart.timeScale().applyOptions({ visible: !showRsi });

      const currentPriceUpColor = getCSSVariable('--price-up', '#dd3c44');
      const currentPriceDownColor = getCSSVariable('--price-down', '#1375ec');
      seriesRef.current.applyOptions({
        upColor: currentPriceUpColor,
        downColor: currentPriceDownColor,
        wickUpColor: currentPriceUpColor,
        wickDownColor: currentPriceDownColor,
      });
      volumeSeriesRef.current?.applyOptions({
        visible: true,
      });

      mainChart.applyOptions({
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 2,
            width: 1,
            color: dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: true,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            style: 2,
          },
        },
      });

      smaLineRef.current?.applyOptions({ visible: showSmaEma, crosshairMarkerVisible: false });
      emaLineRef.current?.applyOptions({ visible: showSmaEma, crosshairMarkerVisible: false });

      if (!rsiChart) {
        mainChart.priceScale('right').applyOptions({ minimumWidth: 0 });
      }
    }

    if (rsiChart && rsiLineRef.current) {
      rsiChart.applyOptions({
        width,
        height: rsiH,
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            visible: true,
            style: 2,
            width: 1,
            color: dark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: true,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            style: 2,
          },
        },
      });
      rsiLineRef.current.applyOptions({
        visible: showRsi,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(2) },
      });
      rsiMidZoneRef.current?.applyOptions({ visible: showRsi, crosshairMarkerVisible: false });
    }

    if (showRsi && mainChartRef.current && rsiChartRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncStackedRightPriceScales(mainChartRef.current, rsiChartRef.current);
        });
      });
    }

    if (showRsi && mainChart && rsiChart) {
      setupTimeSync();
    } else {
      clearTimeSync();
    }

    const handleClick = (event: MouseEvent) => {
      const mainChartApi = mainChartRef.current;
      if (!mainChartApi || !onDateClick) return;

      const mainRect = mainPane.getBoundingClientRect();
      const cx = event.clientX;
      const cy = event.clientY;
      let rect = mainRect;
      let chartApi = mainChartApi;
      if (showRsi && rsiPaneRef.current && rsiChartRef.current) {
        const rsiRect = rsiPaneRef.current.getBoundingClientRect();
        if (cy >= rsiRect.top && cy <= rsiRect.bottom) {
          rect = rsiRect;
          chartApi = rsiChartRef.current;
        }
      }

      const x = cx - rect.left;
      const coordinate = chartApi.timeScale().coordinateToTime(x);
      if (coordinate === null) {
        onDateClick(null);
        return;
      }

      let timeString: string;
      if (typeof coordinate === 'string') {
        timeString = coordinate;
      } else {
        const date = new Date((coordinate as number) * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        timeString = `${year}-${month}-${day}`;
      }

      const data = allChartData.current.get(timeString);
      onDateClick(data || null);
    };

    outer.addEventListener('click', handleClick);

    return () => {
      outer.removeEventListener('click', handleClick);
      clearTimeSync();
    };
  }, [
    checkAndLoadData,
    clearTimeSync,
    containerSize.width,
    containerSize.height,
    dateRange.endDate,
    onDateClick,
    priceData,
    setupTimeSync,
    showRsi,
    showSmaEma,
  ]);

  useEffect(() => {
    syncSeriesFromMap();
  }, [showSmaEma, showRsi, syncSeriesFromMap]);

  useEffect(() => {
    if (!showSmaEma && !showRsi) {
      setIndicatorLegend({ sma: null, ema: null, rsi: null });
    }
  }, [showSmaEma, showRsi]);

  useEffect(() => {
    if (!showSmaEma && !showRsi) {
      setHoverLegend({ active: false, sma: null, ema: null, rsi: null });
    }
  }, [showSmaEma, showRsi]);

  useEffect(() => {
    return () => {
      clearTimeSync();
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiLineRef.current = null;
      }
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
        smaLineRef.current = null;
        emaLineRef.current = null;
        currentPriceLineRef.current = null;
      }
    };
  }, [clearTimeSync]);

  useEffect(() => {
    if (currentPrice !== null && seriesRef.current) {
      const mainColor =
        getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim() || '#02a262';

      if (currentPriceLineRef.current === null) {
        currentPriceLineRef.current = seriesRef.current.createPriceLine({
          price: currentPrice,
          color: mainColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '',
        });
      } else {
        currentPriceLineRef.current.applyOptions({
          price: currentPrice,
          color: mainColor,
        });
      }
    }
  }, [currentPrice]);

  const hasNoData = !isLoading && (!priceDataList || priceDataList.length === 0);
  const formatLegendValue = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '-';
    return value.toFixed(2);
  };
  const valueForDisplay = (latest: number | null, hovered: number | null): number | null =>
    hoverLegend.active ? hovered : latest;

  return (
    <div
      ref={chartStackRef}
      className={containerClassName}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={mainPaneRef}
        style={{
          flex: showRsi ? 1 - RSI_PANE_RATIO : 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {showSmaEma ? (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 8,
              zIndex: 10,
              pointerEvents: 'none',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--foreground)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              opacity: 0.92,
            }}
          >
            <span>SMA(20) {formatLegendValue(valueForDisplay(indicatorLegend.sma, hoverLegend.sma))}</span>
            <span>EMA(20) {formatLegendValue(valueForDisplay(indicatorLegend.ema, hoverLegend.ema))}</span>
          </div>
        ) : null}
      </div>
      {showRsi ? (
        <div
          ref={rsiPaneRef}
          style={{
            flex: RSI_PANE_RATIO,
            minHeight: 0,
            position: 'relative',
            borderTop: '1px solid rgba(128, 128, 128, 0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 8,
              zIndex: 10,
              pointerEvents: 'none',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--foreground)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              opacity: 0.92,
            }}
          >
            <span>RSI(14) {formatLegendValue(valueForDisplay(indicatorLegend.rsi, hoverLegend.rsi))}</span>
          </div>
        </div>
      ) : null}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--foreground)',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        >
          로딩 중...
        </div>
      )}
      {hasNoData && <div className="coin-detail-chart-empty">지원하지 않는 종목입니다.</div>}
    </div>
  );
}
