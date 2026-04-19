'use client';

import { useEffect, useLayoutEffect, useRef, useMemo, useState, useCallback } from 'react';
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
import {
  buildBollingerLineData,
  buildMacdLineData,
  buildRsiLineData,
  buildSmaEmaLineData,
  CHART_BB_STD_DEV_DEFAULT,
  CHART_INDICATOR_PERIODS,
  type ChartIndicatorLineWidthPreset,
} from '@/features/coins/utils/chartTechnicalIndicators';

interface CoinDetailCandleChartProps {
  coinId: number;
  marketCode: string;
  containerClassName?: string;
  onDateClick?: (dateData: CoinPriceDayResponse | null) => void;
  /** SMA(20) 오버레이 표시 */
  showSma?: boolean;
  /** EMA(20) 오버레이 표시 */
  showEma?: boolean;
  /** RSI(14) 보조 패널 표시 */
  showRsi?: boolean;
  /** MACD 보조 패널 표시 (RSI 아래 스택) */
  showMacd?: boolean;
  /** 거래량 히스토그램 표시 */
  showVolume?: boolean;
  /** 볼린저 밴드 표시 */
  showBb?: boolean;
  /** SMA 기간 (일) */
  smaPeriod?: number;
  /** EMA 기간 (일) */
  emaPeriod?: number;
  /** RSI 기간 (일) */
  rsiPeriod?: number;
  /** MACD 단기·장기·시그널 기간 */
  macdFastPeriod?: number;
  macdSlowPeriod?: number;
  macdSignalPeriod?: number;
  /** 볼린저 기간 (일) */
  bbPeriod?: number;
  /** 볼린저 표준편차 배수 */
  bbStdDev?: number;
  /** 사용자 지정 선색 (미지정 시 테마 기본) */
  smaColor?: string | null;
  emaColor?: string | null;
  rsiColor?: string | null;
  macdColor?: string | null;
  macdSignalLineColor?: string | null;
  bbColor?: string | null;
  smaLineWidth?: ChartIndicatorLineWidthPreset;
  emaLineWidth?: ChartIndicatorLineWidthPreset;
  rsiLineWidth?: ChartIndicatorLineWidthPreset;
  macdLineWidth?: ChartIndicatorLineWidthPreset;
  bbLineWidth?: ChartIndicatorLineWidthPreset;
}

type IndicatorLegendSnapshot = {
  sma: number | null;
  ema: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
};

type HoverLegendState = {
  active: boolean;
  sma: number | null;
  ema: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
};

const MIN_DATE = new Date('2017-01-01T00:00:00');
/** RSI·MACD 등 하단 패널 하나당 높이 비율 */
const LOWER_PANE_RATIO = 0.23;
/**
 * RSI+MACD 동시 표시 시 MACD만 하단 시간축을 쓰므로, 가격 플롯 체감 높이가 RSI보다 작아 보임.
 * MACD 패널에만 비율을 가산해 두 패널의 플롯 영역을 맞춤.
 */
const LOWER_PANE_MACD_EXTRA_WHEN_STACKED = 0.055;
/** 하단 보조 패널(RSI·MACD) 가격축 여백 — 두 패널 동일하게 유지 */
const LOWER_PANE_PRICE_SCALE_MARGINS = { top: 0.08, bottom: 0.08 } as const;
/**
 * 메인 차트 하단에 겹쳐 그리는 거래량 히스토그램 전용 축.
 * top이 클수록 막대가 더 아래·낮게만 그려지므로, top을 낮추면 막대 높이 비율이 커짐.
 */
const VOLUME_HISTOGRAM_SCALE_MARGINS = { top: 0.72, bottom: 0.02 } as const;

function stackedLowerPaneFlex(showRsi: boolean, showMacd: boolean): {
  main: number;
  rsi: number;
  macd: number;
} {
  const rsi = showRsi ? LOWER_PANE_RATIO : 0;
  const macd = showMacd
    ? LOWER_PANE_RATIO + (showRsi ? LOWER_PANE_MACD_EXTRA_WHEN_STACKED : 0)
    : 0;
  const main = Math.max(1 - rsi - macd, 0.01);
  return { main, rsi, macd };
}

/** 메인·RSI 차트 라인 시리즈와 범례 수치 색을 공통으로 맞춤 */
const INDICATOR_LINE_COLORS = {
  sma: { dark: 'rgba(200, 200, 200, 0.85)', light: 'rgba(90, 90, 90, 0.9)' },
  ema: { dark: 'rgba(250, 204, 21, 0.9)', light: 'rgba(180, 130, 0, 0.95)' },
  rsi: { dark: 'rgba(167, 139, 250, 0.88)', light: 'rgba(109, 40, 217, 0.78)' },
  macd: { dark: 'rgba(52, 211, 153, 0.95)', light: 'rgba(5, 150, 105, 0.95)' },
  macdSignal: { dark: 'rgba(251, 191, 36, 0.92)', light: 'rgba(180, 83, 9, 0.9)' },
  bbUpper: { dark: 'rgba(96, 165, 250, 0.92)', light: 'rgba(37, 99, 235, 0.9)' },
  bbMiddle: { dark: 'rgba(200, 200, 210, 0.88)', light: 'rgba(75, 85, 99, 0.9)' },
} as const;

function indicatorLineColor(key: keyof typeof INDICATOR_LINE_COLORS, isDark: boolean): string {
  const c = INDICATOR_LINE_COLORS[key];
  return isDark ? c.dark : c.light;
}

function resolveIndicatorLineColor(
  override: string | null | undefined,
  key: keyof typeof INDICATOR_LINE_COLORS,
  isDark: boolean
): string {
  const t = override?.trim();
  if (t) return t;
  return indicatorLineColor(key, isDark);
}

/** 볼린저: 사용자 색이 있으면 상·중·하 모두 동일, 없으면 상·하는 bbUpper, 중간은 bbMiddle */
function resolveBbUpperLowerColor(override: string | null | undefined, isDark: boolean): string {
  const t = override?.trim();
  if (t) return t;
  return indicatorLineColor('bbUpper', isDark);
}

function resolveBbMiddleLineColor(override: string | null | undefined, isDark: boolean): string {
  const t = override?.trim();
  if (t) return t;
  return indicatorLineColor('bbMiddle', isDark);
}

/** #RGB / #RRGGBB → rgba(…, a) */
function hexToRgbaWithAlpha(hex: string, alpha: number): string {
  let h = hex.trim().slice(1);
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return `rgba(96, 165, 250, ${alpha})`;
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return `rgba(96, 165, 250, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 상·하 밴드 사이 채움색 (사용자 지정색이 있으면 그 색의 옅은 틴트) */
function resolveBbChannelFillColor(override: string | null | undefined, isDark: boolean): string {
  const t = override?.trim();
  if (t) {
    if (t.startsWith('#')) return hexToRgbaWithAlpha(t, 0.16);
    return t;
  }
  return isDark ? 'rgba(96, 165, 250, 0.14)' : 'rgba(37, 99, 235, 0.10)';
}

function parseCssColor(input: string): { r: number; g: number; b: number; a: number } | null {
  const s = input.trim();
  if (!s || s === 'transparent') return null;
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const a = m[4] !== undefined ? Number(m[4]) : 1;
  if ([r, g, b, a].some((x) => !Number.isFinite(x))) return null;
  return { r, g, b, a: Number.isFinite(a) ? a : 1 };
}

function blendOverOpaque(
  back: { r: number; g: number; b: number },
  front: { r: number; g: number; b: number; a: number }
): { r: number; g: number; b: number } {
  const a = front.a;
  return {
    r: Math.round(front.r * a + back.r * (1 - a)),
    g: Math.round(front.g * a + back.g * (1 - a)),
    b: Math.round(front.b * a + back.b * (1 - a)),
  };
}

/**
 * 차트 컨테이너(.coin-detail-chart 등)에 보이는 배경을 HTML과 동일한 불투명 RGB로 환산.
 * 반투명 배경을 캔버스에 그릴 때(transparent 레이아웃 + Area 마스크) 하단·외곽만 달라 보이는 문제를 막는다.
 */
function resolveOpaqueChartSurfaceColor(containerEl: HTMLElement | null): string {
  if (typeof window === 'undefined' || !containerEl) return '#fafafa';

  function compositeSelfAndAncestors(el: HTMLElement | null): { r: number; g: number; b: number } {
    if (!el) return { r: 255, g: 255, b: 255 };
    const below = compositeSelfAndAncestors(el.parentElement);
    const self = parseCssColor(getComputedStyle(el).backgroundColor);
    if (!self) return below;
    if (self.a >= 0.99) return { r: self.r, g: self.g, b: self.b };
    return blendOverOpaque(below, self);
  }

  const rgb = compositeSelfAndAncestors(containerEl);
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

/** 범례 (기간) 괄호 안 숫자 — 본문보다 연하게 */
function indicatorLegendPeriodMutedColor(isDark: boolean): string {
  return isDark ? 'rgba(255, 255, 255, 0.42)' : 'rgba(0, 0, 0, 0.45)';
}

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
 * minimumWidth는 라벨이 더 넓으면 그만큼 초과될 수 있어(문서), RSI·MACD 소수 자릿수 등으로
 * 한쪽만 넓어지지 않도록 실측 중 큰 값을 모두에 적용한다.
 */
function syncStackedRightPriceScales(...charts: (IChartApi | null)[]): void {
  const list = charts.filter((c): c is IChartApi => c !== null);
  if (list.length === 0) return;
  let w = 0;
  for (const c of list) {
    w = Math.max(w, c.priceScale('right').width());
  }
  if (w <= 0) return;
  for (const c of list) {
    c.priceScale('right').applyOptions({ minimumWidth: w });
  }
}

export default function CoinDetailCandleChart({
  coinId,
  marketCode,
  containerClassName = '',
  onDateClick,
  showSma = false,
  showEma = false,
  showRsi = false,
  showMacd = false,
  showVolume = true,
  showBb = false,
  smaPeriod = CHART_INDICATOR_PERIODS.sma,
  emaPeriod = CHART_INDICATOR_PERIODS.ema,
  rsiPeriod = CHART_INDICATOR_PERIODS.rsi,
  macdFastPeriod = CHART_INDICATOR_PERIODS.macdFast,
  macdSlowPeriod = CHART_INDICATOR_PERIODS.macdSlow,
  macdSignalPeriod = CHART_INDICATOR_PERIODS.macdSignal,
  bbPeriod = CHART_INDICATOR_PERIODS.bb,
  bbStdDev = CHART_BB_STD_DEV_DEFAULT,
  smaColor = null,
  emaColor = null,
  rsiColor = null,
  macdColor = null,
  macdSignalLineColor = null,
  bbColor = null,
  smaLineWidth = 1 as ChartIndicatorLineWidthPreset,
  emaLineWidth = 1 as ChartIndicatorLineWidthPreset,
  rsiLineWidth = 1 as ChartIndicatorLineWidthPreset,
  macdLineWidth = 1 as ChartIndicatorLineWidthPreset,
  bbLineWidth = 1 as ChartIndicatorLineWidthPreset,
}: CoinDetailCandleChartProps) {
  const chartStackRef = useRef<HTMLDivElement>(null);
  const mainPaneRef = useRef<HTMLDivElement>(null);
  const rsiPaneRef = useRef<HTMLDivElement>(null);
  const macdPaneRef = useRef<HTMLDivElement>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbFillUpperRef = useRef<ISeriesApi<'Area'> | null>(null);
  const bbFillMaskRef = useRef<ISeriesApi<'Area'> | null>(null);
  const bbUpperLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiMidZoneRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  /** RSI 50 중간 기준선 */
  const rsiMid50PriceLineRef = useRef<IPriceLine | null>(null);
  const macdHistSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);

  const timeSyncLockRef = useRef<'off' | 'main' | 'rsi' | 'macd'>('off');
  const timeUnsubMainRef = useRef<(() => void) | null>(null);
  const timeUnsubRsiRef = useRef<(() => void) | null>(null);
  const timeUnsubMacdRef = useRef<(() => void) | null>(null);
  const crosshairSyncLockRef = useRef<'off' | 'main' | 'rsi' | 'macd'>('off');
  const crosshairUnsubMainRef = useRef<(() => void) | null>(null);
  const crosshairUnsubRsiRef = useRef<(() => void) | null>(null);
  const crosshairUnsubMacdRef = useRef<(() => void) | null>(null);
  const didInitialFitRef = useRef(false);
  const closeByTimeRef = useRef<Map<string, number>>(new Map());
  const smaByTimeRef = useRef<Map<string, number>>(new Map());
  const emaByTimeRef = useRef<Map<string, number>>(new Map());
  const rsiByTimeRef = useRef<Map<string, number>>(new Map());
  const macdByTimeRef = useRef<Map<string, number>>(new Map());
  const macdSignalByTimeRef = useRef<Map<string, number>>(new Map());
  const macdHistByTimeRef = useRef<Map<string, number>>(new Map());
  const bbUpperByTimeRef = useRef<Map<string, number>>(new Map());
  const bbMiddleByTimeRef = useRef<Map<string, number>>(new Map());
  const bbLowerByTimeRef = useRef<Map<string, number>>(new Map());
  /** setData 등으로 메인 시계열이 갱신되는 동안 교차 setVisibleRange 호출 방지 */
  const suppressTimeRangeSyncRef = useRef(false);
  const showRsiRef = useRef(showRsi);
  showRsiRef.current = showRsi;
  const showBbRef = useRef(showBb);
  showBbRef.current = showBb;
  const showMacdRef = useRef(showMacd);
  showMacdRef.current = showMacd;

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
    macd: null,
    macdSignal: null,
    macdHist: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
  });
  const [hoverLegend, setHoverLegend] = useState<HoverLegendState>({
    active: false,
    sma: null,
    ema: null,
    rsi: null,
    macd: null,
    macdSignal: null,
    macdHist: null,
    bbUpper: null,
    bbMiddle: null,
    bbLower: null,
  });

  const [isDarkForLegend, setIsDarkForLegend] = useState(false);

  useLayoutEffect(() => {
    const sync = () => {
      const el = chartStackRef.current;
      setIsDarkForLegend(el ? el.closest('.dark') !== null : false);
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, [containerSize.width, containerSize.height]);

  const setIndicatorLegendSafe = useCallback((next: IndicatorLegendSnapshot) => {
    setIndicatorLegend((prev) =>
      prev.sma === next.sma &&
      prev.ema === next.ema &&
      prev.rsi === next.rsi &&
      prev.macd === next.macd &&
      prev.macdSignal === next.macdSignal &&
      prev.macdHist === next.macdHist &&
      prev.bbUpper === next.bbUpper &&
      prev.bbMiddle === next.bbMiddle &&
      prev.bbLower === next.bbLower
        ? prev
        : next
    );
  }, []);

  const setHoverLegendSafe = useCallback((next: HoverLegendState) => {
    setHoverLegend((prev) =>
      prev.active === next.active &&
      prev.sma === next.sma &&
      prev.ema === next.ema &&
      prev.rsi === next.rsi &&
      prev.macd === next.macd &&
      prev.macdSignal === next.macdSignal &&
      prev.macdHist === next.macdHist &&
      prev.bbUpper === next.bbUpper &&
      prev.bbMiddle === next.bbMiddle &&
      prev.bbLower === next.bbLower
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
      allChartData.current.clear();
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
    /** 서버 데이터 없이 날짜만 깔린 공백 구간을 올리면 타임스케일이 과확대된다. 실제 봉이 있을 때만 패딩 포함 setData */
    const hasCandles = rows.length > 0;
    const paddedCandleRows = hasCandles ? buildPaddedCandleRows(rows) : [];
    const paddedVolumeRows = hasCandles
      ? buildPaddedCandleRows(
          rows.map((row) => ({
            time: row.time,
            value: row.volume,
            color: row.close >= row.open ? 'rgba(221, 60, 68, 0.22)' : 'rgba(19, 117, 236, 0.22)',
          }))
        )
      : [];
    closeByTimeRef.current = new Map(rows.map((row) => [row.time, row.close]));
    const { sma, ema } = buildSmaEmaLineData(rows, { smaPeriod, emaPeriod });
    const rsiData = buildRsiLineData(rows, rsiPeriod);
    const macdBundle = buildMacdLineData(rows, {
      fastPeriod: macdFastPeriod,
      slowPeriod: macdSlowPeriod,
      signalPeriod: macdSignalPeriod,
    });
    const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = buildBollingerLineData(rows, {
      period: bbPeriod,
      stdDev: bbStdDev,
    });
    smaByTimeRef.current = new Map(sma.map((p) => [p.time, p.value]));
    emaByTimeRef.current = new Map(ema.map((p) => [p.time, p.value]));
    rsiByTimeRef.current = new Map(rsiData.map((p) => [p.time, p.value]));
    macdByTimeRef.current = showMacd ? new Map(macdBundle.macd.map((p) => [p.time, p.value])) : new Map();
    macdSignalByTimeRef.current = showMacd
      ? new Map(macdBundle.signal.map((p) => [p.time, p.value]))
      : new Map();
    macdHistByTimeRef.current = showMacd
      ? new Map(macdBundle.histogram.map((p) => [p.time, p.value]))
      : new Map();
    bbUpperByTimeRef.current = showBb ? new Map(bbUpper.map((p) => [p.time, p.value])) : new Map();
    bbMiddleByTimeRef.current = showBb ? new Map(bbMiddle.map((p) => [p.time, p.value])) : new Map();
    bbLowerByTimeRef.current = showBb ? new Map(bbLower.map((p) => [p.time, p.value])) : new Map();
    setIndicatorLegendSafe({
      sma: showSma ? lastLineValue(sma) : null,
      ema: showEma ? lastLineValue(ema) : null,
      rsi: showRsi ? lastLineValue(rsiData) : null,
      macd: showMacd ? lastLineValue(macdBundle.macd) : null,
      macdSignal: showMacd ? lastLineValue(macdBundle.signal) : null,
      macdHist: showMacd ? lastLineValue(macdBundle.histogram) : null,
      bbUpper: showBb ? lastLineValue(bbUpper) : null,
      bbMiddle: showBb ? lastLineValue(bbMiddle) : null,
      bbLower: showBb ? lastLineValue(bbLower) : null,
    });

    suppressTimeRangeSyncRef.current = true;
    try {
      candleSeries.setData(paddedCandleRows);
      volumeSeriesRef.current?.setData(paddedVolumeRows);

      if (smaLineRef.current) {
        smaLineRef.current.setData(showSma && hasCandles ? sma : []);
      }
      if (emaLineRef.current) {
        emaLineRef.current.setData(showEma && hasCandles ? ema : []);
      }
      if (bbFillUpperRef.current) {
        bbFillUpperRef.current.setData(showBb && hasCandles ? bbUpper : []);
      }
      if (bbFillMaskRef.current) {
        bbFillMaskRef.current.setData(showBb && hasCandles ? bbLower : []);
      }
      if (bbUpperLineRef.current) {
        bbUpperLineRef.current.setData(showBb && hasCandles ? bbUpper : []);
      }
      if (bbMiddleLineRef.current) {
        bbMiddleLineRef.current.setData(showBb && hasCandles ? bbMiddle : []);
      }
      if (bbLowerLineRef.current) {
        bbLowerLineRef.current.setData(showBb && hasCandles ? bbLower : []);
      }

      if (rsiLineRef.current && rsiChartRef.current) {
        if (showRsi && hasCandles) {
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

      if (macdHistSeriesRef.current && macdChartRef.current) {
        if (showMacd && hasCandles) {
          const macdHistColored = macdBundle.histogram.map((p) => ({
            time: p.time,
            value: p.value,
            color:
              p.value >= 0 ? 'rgba(221, 60, 68, 0.5)' : 'rgba(19, 117, 236, 0.5)',
          }));
          macdHistSeriesRef.current.setData(buildPaddedCandleRows(macdHistColored));
          macdLineRef.current?.setData(buildPaddedCandleRows(macdBundle.macd));
          macdSignalLineRef.current?.setData(buildPaddedCandleRows(macdBundle.signal));
        } else {
          macdHistSeriesRef.current.setData([]);
          macdLineRef.current?.setData([]);
          macdSignalLineRef.current?.setData([]);
          macdByTimeRef.current = new Map();
          macdSignalByTimeRef.current = new Map();
          macdHistByTimeRef.current = new Map();
        }
      }
    } finally {
      suppressTimeRangeSyncRef.current = false;
    }

    requestAnimationFrame(() => {
      const main = mainChartRef.current;
      const rsi = rsiChartRef.current;
      const macd = macdChartRef.current;
      if (!main) return;

      const shouldInitialFit =
        !didInitialFitRef.current && hasCandles && !isLoading;
      if (shouldInitialFit) {
        didInitialFitRef.current = true;
        main.timeScale().fitContent();
        main.timeScale().scrollToRealTime();
        if (showRsi && rsi) {
          rsi.timeScale().fitContent();
          rsi.timeScale().scrollToRealTime();
        }
        if (showMacd && macd) {
          macd.timeScale().fitContent();
          macd.timeScale().scrollToRealTime();
        }
      }

      const range = main.timeScale().getVisibleRange();
      if (
        hasCandles &&
        (showRsi || showMacd) &&
        (rsi || macd) &&
        hasValidTimeRange(range)
      ) {
        timeSyncLockRef.current = 'main';
        try {
          if (rsi && showRsiRef.current) safeSetVisibleRange(rsi, range);
          if (macd && showMacdRef.current) safeSetVisibleRange(macd, range);
        } finally {
          timeSyncLockRef.current = 'off';
        }
      }
      syncStackedRightPriceScales(main, rsi, macd);
    });
  }, [
    dateRange.endDate,
    priceData,
    setIndicatorLegendSafe,
    showSma,
    showEma,
    showRsi,
    showMacd,
    showVolume,
    showBb,
    smaPeriod,
    emaPeriod,
    rsiPeriod,
    macdFastPeriod,
    macdSlowPeriod,
    macdSignalPeriod,
    bbPeriod,
    bbStdDev,
    isLoading,
  ]);

  useEffect(() => {
    if (!isLoading && priceDataList && priceDataList.length > 0) {
      const rangeKey = getDateRangeKey(new Date(dateRange.startDate), new Date(dateRange.endDate));

      allChartData.current.clear();
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
      allChartData.current.clear();
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
    timeUnsubMacdRef.current?.();
    crosshairUnsubMainRef.current?.();
    crosshairUnsubRsiRef.current?.();
    crosshairUnsubMacdRef.current?.();
    timeUnsubMainRef.current = null;
    timeUnsubRsiRef.current = null;
    timeUnsubMacdRef.current = null;
    crosshairUnsubMainRef.current = null;
    crosshairUnsubRsiRef.current = null;
    crosshairUnsubMacdRef.current = null;
  }, []);

  const setupTimeSync = useCallback(() => {
    clearTimeSync();
    const main = mainChartRef.current;
    const rsi = rsiChartRef.current;
    const macd = macdChartRef.current;
    if (!main) return;

    const hoverOff: HoverLegendState = {
      active: false,
      sma: null,
      ema: null,
      rsi: null,
      macd: null,
      macdSignal: null,
      macdHist: null,
      bbUpper: null,
      bbMiddle: null,
      bbLower: null,
    };

    const hoverAt = (timeKey: string): Omit<HoverLegendState, 'active'> => ({
      sma: showSma ? (smaByTimeRef.current.get(timeKey) ?? null) : null,
      ema: showEma ? (emaByTimeRef.current.get(timeKey) ?? null) : null,
      rsi: showRsi ? (rsiByTimeRef.current.get(timeKey) ?? null) : null,
      macd: showMacdRef.current ? (macdByTimeRef.current.get(timeKey) ?? null) : null,
      macdSignal: showMacdRef.current ? (macdSignalByTimeRef.current.get(timeKey) ?? null) : null,
      macdHist: showMacdRef.current ? (macdHistByTimeRef.current.get(timeKey) ?? null) : null,
      bbUpper: showBbRef.current ? (bbUpperByTimeRef.current.get(timeKey) ?? null) : null,
      bbMiddle: showBbRef.current ? (bbMiddleByTimeRef.current.get(timeKey) ?? null) : null,
      bbLower: showBbRef.current ? (bbLowerByTimeRef.current.get(timeKey) ?? null) : null,
    });

    const onMain = () => {
      if (suppressTimeRangeSyncRef.current) return;
      if (timeSyncLockRef.current === 'rsi' || timeSyncLockRef.current === 'macd') return;
      const mainLive = mainChartRef.current;
      if (!mainLive) return;
      const range = mainLive.timeScale().getVisibleRange();
      if (!hasValidTimeRange(range)) return;
      timeSyncLockRef.current = 'main';
      try {
        if (showRsiRef.current && rsiChartRef.current) safeSetVisibleRange(rsiChartRef.current, range);
        if (showMacdRef.current && macdChartRef.current) safeSetVisibleRange(macdChartRef.current, range);
      } finally {
        timeSyncLockRef.current = 'off';
      }
      syncStackedRightPriceScales(mainChartRef.current, rsiChartRef.current, macdChartRef.current);
    };

    main.timeScale().subscribeVisibleTimeRangeChange(onMain);
    timeUnsubMainRef.current = () => main.timeScale().unsubscribeVisibleTimeRangeChange(onMain);

    if (rsi && showRsi) {
      const onRsi = () => {
        if (suppressTimeRangeSyncRef.current) return;
        if (timeSyncLockRef.current === 'main' || timeSyncLockRef.current === 'macd') return;
        if (!showRsiRef.current) return;
        const mainLive = mainChartRef.current;
        const rsiLive = rsiChartRef.current;
        if (!mainLive || !rsiLive) return;
        const range = rsiLive.timeScale().getVisibleRange();
        if (!hasValidTimeRange(range)) return;
        timeSyncLockRef.current = 'rsi';
        try {
          safeSetVisibleRange(mainLive, range);
          if (showMacdRef.current && macdChartRef.current) safeSetVisibleRange(macdChartRef.current, range);
        } finally {
          timeSyncLockRef.current = 'off';
        }
        syncStackedRightPriceScales(mainLive, rsiLive, macdChartRef.current);
      };
      rsi.timeScale().subscribeVisibleTimeRangeChange(onRsi);
      timeUnsubRsiRef.current = () => rsi.timeScale().unsubscribeVisibleTimeRangeChange(onRsi);
    }

    if (macd && showMacd) {
      const onMacd = () => {
        if (suppressTimeRangeSyncRef.current) return;
        if (timeSyncLockRef.current === 'main' || timeSyncLockRef.current === 'rsi') return;
        if (!showMacdRef.current) return;
        const mainLive = mainChartRef.current;
        const macdLive = macdChartRef.current;
        if (!mainLive || !macdLive) return;
        const range = macdLive.timeScale().getVisibleRange();
        if (!hasValidTimeRange(range)) return;
        timeSyncLockRef.current = 'macd';
        try {
          safeSetVisibleRange(mainLive, range);
          if (showRsiRef.current && rsiChartRef.current) safeSetVisibleRange(rsiChartRef.current, range);
        } finally {
          timeSyncLockRef.current = 'off';
        }
        syncStackedRightPriceScales(mainLive, rsiChartRef.current, macdLive);
      };
      macd.timeScale().subscribeVisibleTimeRangeChange(onMacd);
      timeUnsubMacdRef.current = () => macd.timeScale().unsubscribeVisibleTimeRangeChange(onMacd);
    }

    const onMainCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      if (suppressTimeRangeSyncRef.current) return;
      if (crosshairSyncLockRef.current === 'rsi' || crosshairSyncLockRef.current === 'macd') return;
      const mainLive = mainChartRef.current;
      const candleSeriesLive = seriesRef.current;
      if (!mainLive || !candleSeriesLive) return;

      if (param.time === undefined) {
        setHoverLegendSafe(hoverOff);
        crosshairSyncLockRef.current = 'main';
        try {
          rsiChartRef.current?.clearCrosshairPosition();
          macdChartRef.current?.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      const timeKey = toTimeKey(param.time);
      setHoverLegendSafe({ active: true, ...hoverAt(timeKey) });

      if (showRsiRef.current && rsiChartRef.current && rsiLineRef.current) {
        const rsiPrice = rsiByTimeRef.current.get(timeKey);
        crosshairSyncLockRef.current = 'main';
        try {
          if (typeof rsiPrice === 'number') {
            try {
              rsiChartRef.current.setCrosshairPosition(rsiPrice, param.time, rsiLineRef.current);
            } catch {
              rsiChartRef.current.clearCrosshairPosition();
            }
          } else {
            rsiChartRef.current.clearCrosshairPosition();
          }
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
      }

      if (showMacdRef.current && macdChartRef.current && macdLineRef.current) {
        const mv = macdByTimeRef.current.get(timeKey);
        crosshairSyncLockRef.current = 'main';
        try {
          if (typeof mv === 'number') {
            try {
              macdChartRef.current.setCrosshairPosition(mv, param.time, macdLineRef.current);
            } catch {
              macdChartRef.current.clearCrosshairPosition();
            }
          } else {
            macdChartRef.current.clearCrosshairPosition();
          }
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
      }
    };

    const onRsiCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      if (suppressTimeRangeSyncRef.current) return;
      if (crosshairSyncLockRef.current === 'main' || crosshairSyncLockRef.current === 'macd') return;
      const mainLive = mainChartRef.current;
      const rsiLive = rsiChartRef.current;
      const candleSeriesLive = seriesRef.current;
      if (!mainLive || !rsiLive || !candleSeriesLive || !showRsiRef.current) return;

      if (param.time === undefined) {
        setHoverLegendSafe(hoverOff);
        crosshairSyncLockRef.current = 'rsi';
        try {
          mainLive.clearCrosshairPosition();
          macdChartRef.current?.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      const timeKey = toTimeKey(param.time);
      setHoverLegendSafe({ active: true, ...hoverAt(timeKey) });

      const closePrice = closeByTimeRef.current.get(timeKey);
      crosshairSyncLockRef.current = 'rsi';
      try {
        if (typeof closePrice === 'number') {
          try {
            mainLive.setCrosshairPosition(closePrice, param.time, candleSeriesLive);
          } catch {
            mainLive.clearCrosshairPosition();
          }
        } else {
          mainLive.clearCrosshairPosition();
        }
        if (showMacdRef.current && macdChartRef.current && macdLineRef.current) {
          const mv = macdByTimeRef.current.get(timeKey);
          if (typeof mv === 'number') {
            try {
              macdChartRef.current.setCrosshairPosition(mv, param.time, macdLineRef.current);
            } catch {
              macdChartRef.current.clearCrosshairPosition();
            }
          } else {
            macdChartRef.current.clearCrosshairPosition();
          }
        }
      } finally {
        crosshairSyncLockRef.current = 'off';
      }
    };

    const onMacdCrosshair = (param: { time?: Time; seriesData: Map<unknown, unknown> }) => {
      if (suppressTimeRangeSyncRef.current) return;
      if (crosshairSyncLockRef.current === 'main' || crosshairSyncLockRef.current === 'rsi') return;
      const mainLive = mainChartRef.current;
      const macdLive = macdChartRef.current;
      const candleSeriesLive = seriesRef.current;
      if (!mainLive || !macdLive || !candleSeriesLive || !showMacdRef.current) return;

      if (param.time === undefined) {
        setHoverLegendSafe(hoverOff);
        crosshairSyncLockRef.current = 'macd';
        try {
          mainLive.clearCrosshairPosition();
          rsiChartRef.current?.clearCrosshairPosition();
        } finally {
          crosshairSyncLockRef.current = 'off';
        }
        return;
      }

      const timeKey = toTimeKey(param.time);
      setHoverLegendSafe({ active: true, ...hoverAt(timeKey) });

      const closePrice = closeByTimeRef.current.get(timeKey);
      crosshairSyncLockRef.current = 'macd';
      try {
        if (typeof closePrice === 'number') {
          try {
            mainLive.setCrosshairPosition(closePrice, param.time, candleSeriesLive);
          } catch {
            mainLive.clearCrosshairPosition();
          }
        } else {
          mainLive.clearCrosshairPosition();
        }
        if (showRsiRef.current && rsiChartRef.current && rsiLineRef.current) {
          const rsiPrice = rsiByTimeRef.current.get(timeKey);
          if (typeof rsiPrice === 'number') {
            try {
              rsiChartRef.current.setCrosshairPosition(rsiPrice, param.time, rsiLineRef.current);
            } catch {
              rsiChartRef.current.clearCrosshairPosition();
            }
          } else {
            rsiChartRef.current.clearCrosshairPosition();
          }
        }
      } finally {
        crosshairSyncLockRef.current = 'off';
      }
    };

    main.subscribeCrosshairMove(onMainCrosshair);
    crosshairUnsubMainRef.current = () => main.unsubscribeCrosshairMove(onMainCrosshair);
    if (rsi && showRsi) {
      rsi.subscribeCrosshairMove(onRsiCrosshair);
      crosshairUnsubRsiRef.current = () => rsi.unsubscribeCrosshairMove(onRsiCrosshair);
    }
    if (macd && showMacd) {
      macd.subscribeCrosshairMove(onMacdCrosshair);
      crosshairUnsubMacdRef.current = () => macd.unsubscribeCrosshairMove(onMacdCrosshair);
    }
  }, [clearTimeSync, setHoverLegendSafe, showRsi, showMacd, showSma, showEma]);

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

    const { rsi: rsiFlex, macd: macdFlex } = stackedLowerPaneFlex(showRsi, showMacd);
    const rsiH = showRsi ? Math.max(Math.floor(height * rsiFlex), 1) : 0;
    const macdH = showMacd ? Math.max(Math.floor(height * macdFlex), 1) : 0;
    const mainH = Math.max(height - rsiH - macdH, 1);

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
      const plotSurfaceColor = resolveOpaqueChartSurfaceColor(outer);
      const chart = createChart(mainPane, {
        width,
        height: mainH,
        layout: {
          background: { color: plotSurfaceColor },
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
          visible: !showRsi && !showMacd,
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

      const bbChannelFill = resolveBbChannelFillColor(bbColor, isDarkMode);

      const bbFillUpperSeries = chart.addAreaSeries({
        lineColor: 'rgba(0, 0, 0, 0)',
        lineVisible: false,
        lineWidth: 1,
        topColor: bbChannelFill,
        bottomColor: bbChannelFill,
        invertFilledArea: false,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        visible: showBb,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      const bbFillMaskSeries = chart.addAreaSeries({
        lineColor: 'rgba(0, 0, 0, 0)',
        lineVisible: false,
        lineWidth: 1,
        topColor: plotSurfaceColor,
        bottomColor: plotSurfaceColor,
        invertFilledArea: false,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        visible: showBb,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      bbFillUpperRef.current = bbFillUpperSeries;
      bbFillMaskRef.current = bbFillMaskSeries;

      const bbBandResolved = resolveBbUpperLowerColor(bbColor, isDarkMode);
      const bbMidResolved = resolveBbMiddleLineColor(bbColor, isDarkMode);
      const bbUpperSeries = chart.addLineSeries({
        color: bbBandResolved,
        lineWidth: bbLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showBb,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      const bbMiddleSeries = chart.addLineSeries({
        color: bbMidResolved,
        lineWidth: bbLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showBb,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      const bbLowerSeries = chart.addLineSeries({
        color: bbBandResolved,
        lineWidth: bbLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showBb,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      bbUpperLineRef.current = bbUpperSeries;
      bbMiddleLineRef.current = bbMiddleSeries;
      bbLowerLineRef.current = bbLowerSeries;

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
        visible: showVolume,
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { ...VOLUME_HISTOGRAM_SCALE_MARGINS },
      });

      const smaResolved = resolveIndicatorLineColor(smaColor, 'sma', isDarkMode);
      const emaResolved = resolveIndicatorLineColor(emaColor, 'ema', isDarkMode);

      const smaSeries = chart.addLineSeries({
        color: smaResolved,
        lineWidth: smaLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showSma,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => formatPrice(p) },
      });
      const emaSeries = chart.addLineSeries({
        color: emaResolved,
        lineWidth: emaLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        visible: showEma,
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
        const { sma, ema } = buildSmaEmaLineData(rows, { smaPeriod, emaPeriod });
        if (showSma) smaSeries.setData(sma);
        else smaSeries.setData([]);
        if (showEma) emaSeries.setData(ema);
        else emaSeries.setData([]);
        const bbInit = buildBollingerLineData(rows, { period: bbPeriod, stdDev: bbStdDev });
        if (showBb) {
          bbFillUpperSeries.setData(bbInit.upper);
          bbFillMaskSeries.setData(bbInit.lower);
          bbUpperSeries.setData(bbInit.upper);
          bbMiddleSeries.setData(bbInit.middle);
          bbLowerSeries.setData(bbInit.lower);
        } else {
          bbFillUpperSeries.setData([]);
          bbFillMaskSeries.setData([]);
          bbUpperSeries.setData([]);
          bbMiddleSeries.setData([]);
          bbLowerSeries.setData([]);
        }
      }
    }

    if (showRsi && rsiPaneRef.current && !rsiChartRef.current) {
      const rsiPane = rsiPaneRef.current;
      const rsiResolved = resolveIndicatorLineColor(rsiColor, 'rsi', isDarkMode);
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
          scaleMargins: { ...LOWER_PANE_PRICE_SCALE_MARGINS },
        },
        timeScale: {
          borderColor,
          visible: showRsi && !showMacd,
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
        color: rsiResolved,
        lineWidth: rsiLineWidth,
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
      rsiMid50PriceLineRef.current = rsiSeries.createPriceLine({
        price: 50,
        color: isDarkMode ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.2)',
        lineWidth: 1,
        lineStyle: 1,
        axisLabelVisible: false,
      });

      if (allChartData.current.size > 0) {
        const todayUtc = getTodayUtcString();
        const endDateUtc = dateRange.endDate.slice(0, 10);
        const rows = buildCandleChartRows(allChartData.current, endDateUtc, todayUtc, priceData ?? null);
        const rsiData = buildRsiLineData(rows, rsiPeriod);
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

    if (showMacd && macdPaneRef.current && !macdChartRef.current) {
      const macdPane = macdPaneRef.current;
      const macdLn = resolveIndicatorLineColor(macdColor, 'macd', isDarkMode);
      const macdSig = resolveIndicatorLineColor(macdSignalLineColor, 'macdSignal', isDarkMode);
      const macdChart = createChart(macdPane, {
        width,
        height: macdH,
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
          scaleMargins: { ...LOWER_PANE_PRICE_SCALE_MARGINS },
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

      const macdHist = macdChart.addHistogramSeries({
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const macdLineS = macdChart.addLineSeries({
        color: macdLn,
        lineWidth: macdLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
      });
      const macdSigS = macdChart.addLineSeries({
        color: macdSig,
        lineWidth: macdLineWidth,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
      });

      macdChartRef.current = macdChart;
      macdHistSeriesRef.current = macdHist;
      macdLineRef.current = macdLineS;
      macdSignalLineRef.current = macdSigS;

      macdLineS.createPriceLine({
        price: 0,
        color: borderColor,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
      });

      if (allChartData.current.size > 0) {
        const todayUtc = getTodayUtcString();
        const endDateUtc = dateRange.endDate.slice(0, 10);
        const rows = buildCandleChartRows(allChartData.current, endDateUtc, todayUtc, priceData ?? null);
        const bundle = buildMacdLineData(rows, {
          fastPeriod: macdFastPeriod,
          slowPeriod: macdSlowPeriod,
          signalPeriod: macdSignalPeriod,
        });
        const histColored = bundle.histogram.map((p) => ({
          time: p.time,
          value: p.value,
          color: p.value >= 0 ? 'rgba(221, 60, 68, 0.5)' : 'rgba(19, 117, 236, 0.5)',
        }));
        macdHist.setData(buildPaddedCandleRows(histColored));
        macdLineS.setData(buildPaddedCandleRows(bundle.macd));
        macdSigS.setData(buildPaddedCandleRows(bundle.signal));
      }

      const vrM = mainChartRef.current?.timeScale().getVisibleRange();
      timeSyncLockRef.current = 'main';
      try {
        safeSetVisibleRange(macdChart, vrM);
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
      rsiMid50PriceLineRef.current = null;
      rsiByTimeRef.current = new Map();
    }

    if (!showMacd && macdChartRef.current) {
      clearTimeSync();
      macdChartRef.current.remove();
      macdChartRef.current = null;
      macdHistSeriesRef.current = null;
      macdLineRef.current = null;
      macdSignalLineRef.current = null;
      macdByTimeRef.current = new Map();
      macdSignalByTimeRef.current = new Map();
      macdHistByTimeRef.current = new Map();
    }

    const mainChart = mainChartRef.current;
    const rsiChart = rsiChartRef.current;
    const macdChart = macdChartRef.current;
    const dark = outer.closest('.dark') !== null;

    if (mainChart && seriesRef.current) {
      const plotSurfaceColor = resolveOpaqueChartSurfaceColor(outer);
      mainChart.applyOptions({
        width,
        height: mainH,
        layout: { background: { color: plotSurfaceColor } },
      });
      mainChart.timeScale().applyOptions({ visible: !showRsi && !showMacd });

      const currentPriceUpColor = getCSSVariable('--price-up', '#dd3c44');
      const currentPriceDownColor = getCSSVariable('--price-down', '#1375ec');
      seriesRef.current.applyOptions({
        upColor: currentPriceUpColor,
        downColor: currentPriceDownColor,
        wickUpColor: currentPriceUpColor,
        wickDownColor: currentPriceDownColor,
      });
      volumeSeriesRef.current?.applyOptions({
        visible: showVolume,
      });
      volumeSeriesRef.current?.priceScale().applyOptions({
        scaleMargins: { ...VOLUME_HISTOGRAM_SCALE_MARGINS },
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

      smaLineRef.current?.applyOptions({ visible: showSma, crosshairMarkerVisible: false });
      emaLineRef.current?.applyOptions({ visible: showEma, crosshairMarkerVisible: false });
      bbFillUpperRef.current?.applyOptions({ visible: showBb });
      bbFillMaskRef.current?.applyOptions({ visible: showBb });
      bbUpperLineRef.current?.applyOptions({ visible: showBb, crosshairMarkerVisible: false });
      bbMiddleLineRef.current?.applyOptions({ visible: showBb, crosshairMarkerVisible: false });
      bbLowerLineRef.current?.applyOptions({ visible: showBb, crosshairMarkerVisible: false });

      if (!rsiChart && !macdChart) {
        mainChart.priceScale('right').applyOptions({ minimumWidth: 0 });
      }
    }

    if (rsiChart && rsiLineRef.current) {
      rsiChart.timeScale().applyOptions({ visible: showRsi && !showMacd });
      rsiChart.applyOptions({
        width,
        height: rsiH,
        rightPriceScale: {
          scaleMargins: { ...LOWER_PANE_PRICE_SCALE_MARGINS },
        },
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

    if (macdChart && macdHistSeriesRef.current) {
      macdChart.applyOptions({
        width,
        height: macdH,
        rightPriceScale: {
          scaleMargins: { ...LOWER_PANE_PRICE_SCALE_MARGINS },
        },
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
      macdHistSeriesRef.current.applyOptions({ visible: showMacd });
      macdLineRef.current?.applyOptions({
        visible: showMacd,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
      });
      macdSignalLineRef.current?.applyOptions({
        visible: showMacd,
        crosshairMarkerVisible: false,
        priceFormat: { type: 'custom', formatter: (p: number) => p.toFixed(4) },
      });
    }

    if (
      mainChartRef.current &&
      (showRsi || showMacd) &&
      (rsiChartRef.current || macdChartRef.current)
    ) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncStackedRightPriceScales(
            mainChartRef.current,
            rsiChartRef.current,
            macdChartRef.current
          );
        });
      });
    }

    if (mainChart) {
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
      if (showMacd && macdPaneRef.current && macdChartRef.current) {
        const macdRect = macdPaneRef.current.getBoundingClientRect();
        if (cy >= macdRect.top && cy <= macdRect.bottom) {
          rect = macdRect;
          chartApi = macdChartRef.current;
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
    showMacd,
    showSma,
    showEma,
    showBb,
    showVolume,
    smaPeriod,
    emaPeriod,
    rsiPeriod,
    macdFastPeriod,
    macdSlowPeriod,
    macdSignalPeriod,
    bbPeriod,
    bbStdDev,
    bbColor,
    bbLineWidth,
    macdColor,
    macdSignalLineColor,
    macdLineWidth,
  ]);

  useEffect(() => {
    syncSeriesFromMap();
  }, [
    showSma,
    showEma,
    showRsi,
    showMacd,
    showVolume,
    showBb,
    smaPeriod,
    emaPeriod,
    rsiPeriod,
    macdFastPeriod,
    macdSlowPeriod,
    macdSignalPeriod,
    bbPeriod,
    bbStdDev,
    syncSeriesFromMap,
  ]);

  useEffect(() => {
    const el = chartStackRef.current;
    if (!el) return;
    const isDark = el.closest('.dark') !== null;
    const smaC = resolveIndicatorLineColor(smaColor, 'sma', isDark);
    const emaC = resolveIndicatorLineColor(emaColor, 'ema', isDark);
    const rsiC = resolveIndicatorLineColor(rsiColor, 'rsi', isDark);
    const macdC = resolveIndicatorLineColor(macdColor, 'macd', isDark);
    const macdSigC = resolveIndicatorLineColor(macdSignalLineColor, 'macdSignal', isDark);
    const bbBandC = resolveBbUpperLowerColor(bbColor, isDark);
    const bbMidC = resolveBbMiddleLineColor(bbColor, isDark);
    const bbFillTint = resolveBbChannelFillColor(bbColor, isDark);
    const plotSurfaceColor = resolveOpaqueChartSurfaceColor(chartStackRef.current);
    smaLineRef.current?.applyOptions({ color: smaC, lineWidth: smaLineWidth });
    emaLineRef.current?.applyOptions({ color: emaC, lineWidth: emaLineWidth });
    rsiLineRef.current?.applyOptions({ color: rsiC, lineWidth: rsiLineWidth });
    rsiMid50PriceLineRef.current?.applyOptions({
      color: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.2)',
    });
    macdLineRef.current?.applyOptions({ color: macdC, lineWidth: macdLineWidth });
    macdSignalLineRef.current?.applyOptions({ color: macdSigC, lineWidth: macdLineWidth });
    mainChartRef.current?.applyOptions({ layout: { background: { color: plotSurfaceColor } } });
    bbFillUpperRef.current?.applyOptions({ topColor: bbFillTint, bottomColor: bbFillTint });
    bbFillMaskRef.current?.applyOptions({ topColor: plotSurfaceColor, bottomColor: plotSurfaceColor });
    bbUpperLineRef.current?.applyOptions({ color: bbBandC, lineWidth: bbLineWidth });
    bbMiddleLineRef.current?.applyOptions({ color: bbMidC, lineWidth: bbLineWidth });
    bbLowerLineRef.current?.applyOptions({ color: bbBandC, lineWidth: bbLineWidth });
  }, [
    smaColor,
    emaColor,
    rsiColor,
    macdColor,
    macdSignalLineColor,
    bbColor,
    smaLineWidth,
    emaLineWidth,
    rsiLineWidth,
    macdLineWidth,
    bbLineWidth,
    isDarkForLegend,
  ]);

  useEffect(() => {
    if (!showSma && !showEma && !showRsi && !showMacd && !showBb) {
      setIndicatorLegend({
        sma: null,
        ema: null,
        rsi: null,
        macd: null,
        macdSignal: null,
        macdHist: null,
        bbUpper: null,
        bbMiddle: null,
        bbLower: null,
      });
    }
  }, [showSma, showEma, showRsi, showMacd, showBb]);

  useEffect(() => {
    if (!showSma && !showEma && !showRsi && !showMacd && !showBb) {
      setHoverLegend({
        active: false,
        sma: null,
        ema: null,
        rsi: null,
        macd: null,
        macdSignal: null,
        macdHist: null,
        bbUpper: null,
        bbMiddle: null,
        bbLower: null,
      });
    }
  }, [showSma, showEma, showRsi, showMacd, showBb]);

  useEffect(() => {
    return () => {
      clearTimeSync();
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiLineRef.current = null;
        rsiMidZoneRef.current = null;
        rsiMid50PriceLineRef.current = null;
      }
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdHistSeriesRef.current = null;
        macdLineRef.current = null;
        macdSignalLineRef.current = null;
      }
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
        smaLineRef.current = null;
        emaLineRef.current = null;
        bbFillUpperRef.current = null;
        bbFillMaskRef.current = null;
        bbUpperLineRef.current = null;
        bbMiddleLineRef.current = null;
        bbLowerLineRef.current = null;
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
  const paneFlex = stackedLowerPaneFlex(showRsi, showMacd);
  const formatLegendValue = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '-';
    return value.toFixed(2);
  };
  const formatMacdLegendValue = (value: number | null): string => {
    if (value === null || !Number.isFinite(value)) return '-';
    return value.toFixed(4);
  };
  const valueForDisplay = (latest: number | null, hovered: number | null): number | null =>
    hoverLegend.active ? hovered : latest;

  const macdHistLegendTextColor = (v: number | null): string => {
    if (v === null || !Number.isFinite(v)) return 'var(--foreground)';
    return v >= 0 ? 'var(--price-up)' : 'var(--price-down)';
  };

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
          flex: paneFlex.main,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {showSma || showEma || showBb ? (
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 8,
              zIndex: 10,
              pointerEvents: 'none',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {showSma ? (
              <span>
                <span style={{ color: 'var(--foreground)' }}>MA </span>
                <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}>
                  ({smaPeriod})
                </span>
                {' '}
                <span style={{ color: resolveIndicatorLineColor(smaColor, 'sma', isDarkForLegend) }}>
                  {formatLegendValue(valueForDisplay(indicatorLegend.sma, hoverLegend.sma))}
                </span>
              </span>
            ) : null}
            {showEma ? (
              <span>
                <span style={{ color: 'var(--foreground)' }}>EMA </span>
                <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}>
                  ({emaPeriod})
                </span>
                {' '}
                <span style={{ color: resolveIndicatorLineColor(emaColor, 'ema', isDarkForLegend) }}>
                  {formatLegendValue(valueForDisplay(indicatorLegend.ema, hoverLegend.ema))}
                </span>
              </span>
            ) : null}
            {showBb ? (
              <span style={{ whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--foreground)' }}>BB </span>
                <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}>
                  ({bbPeriod}, σ{bbStdDev})
                </span>
                {' '}
                <span style={{ color: 'var(--foreground)' }}>U </span>
                <span style={{ color: resolveBbUpperLowerColor(bbColor, isDarkForLegend) }}>
                  {formatLegendValue(valueForDisplay(indicatorLegend.bbUpper, hoverLegend.bbUpper))}
                </span>
                <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}> · </span>
                <span style={{ color: 'var(--foreground)' }}>M </span>
                <span style={{ color: resolveBbMiddleLineColor(bbColor, isDarkForLegend) }}>
                  {formatLegendValue(valueForDisplay(indicatorLegend.bbMiddle, hoverLegend.bbMiddle))}
                </span>
                <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}> · </span>
                <span style={{ color: 'var(--foreground)' }}>L </span>
                <span style={{ color: resolveBbUpperLowerColor(bbColor, isDarkForLegend) }}>
                  {formatLegendValue(valueForDisplay(indicatorLegend.bbLower, hoverLegend.bbLower))}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {showRsi ? (
        <div
          ref={rsiPaneRef}
          style={{
            flex: paneFlex.rsi,
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
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span>
              <span style={{ color: 'var(--foreground)' }}>RSI </span>
              <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}>
                ({rsiPeriod})
              </span>
              {' '}
              <span style={{ color: resolveIndicatorLineColor(rsiColor, 'rsi', isDarkForLegend) }}>
                {formatLegendValue(valueForDisplay(indicatorLegend.rsi, hoverLegend.rsi))}
              </span>
            </span>
          </div>
        </div>
      ) : null}
      {showMacd ? (
        <div
          ref={macdPaneRef}
          style={{
            flex: paneFlex.macd,
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
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--foreground)' }}>MACD </span>
              <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}>
                ({macdFastPeriod},{macdSlowPeriod},{macdSignalPeriod})
              </span>
              {' '}
              <span style={{ color: 'var(--foreground)' }}>M </span>
              <span style={{ color: resolveIndicatorLineColor(macdColor, 'macd', isDarkForLegend) }}>
                {formatMacdLegendValue(valueForDisplay(indicatorLegend.macd, hoverLegend.macd))}
              </span>
              <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}> · </span>
              <span style={{ color: 'var(--foreground)' }}>Sig </span>
              <span style={{ color: resolveIndicatorLineColor(macdSignalLineColor, 'macdSignal', isDarkForLegend) }}>
                {formatMacdLegendValue(valueForDisplay(indicatorLegend.macdSignal, hoverLegend.macdSignal))}
              </span>
              <span style={{ color: indicatorLegendPeriodMutedColor(isDarkForLegend) }}> · </span>
              <span style={{ color: 'var(--foreground)' }}>H </span>
              <span
                style={{
                  color: macdHistLegendTextColor(
                    valueForDisplay(indicatorLegend.macdHist, hoverLegend.macdHist)
                  ),
                }}
              >
                {formatMacdLegendValue(valueForDisplay(indicatorLegend.macdHist, hoverLegend.macdHist))}
              </span>
            </span>
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
