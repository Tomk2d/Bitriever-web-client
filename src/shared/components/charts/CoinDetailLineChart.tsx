'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import { coinPriceService, CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { getTodayUtcString } from '@/shared/utils/dateUtils';

interface CoinDetailLineChartProps {
  coinId: number;
  marketCode: string;
  containerClassName?: string;
  onDateClick?: (dateData: CoinPriceDayResponse | null) => void;
}

const MIN_DATE = new Date('2017-01-01T00:00:00');
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export default function CoinDetailLineChart({
  coinId,
  marketCode,
  containerClassName = '',
  onDateClick,
}: CoinDetailLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const currentPriceLineRef = useRef<IPriceLine | null>(null);
  const loadedRangesRef = useRef<Set<string>>(new Set());
  const loadingRangesRef = useRef<Set<string>>(new Set());
  const pendingRangesRef = useRef<Set<string>>(new Set());
  const earliestLoadedDateRef = useRef<Date | null>(null);
  const endReachedRef = useRef<boolean>(false);
  const [visibleRange, setVisibleRange] = useState<{ from: Date; to: Date } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  /** 컨테이너 크기: 0→양수로 바뀔 때 차트 생성 effect 재실행 (두 번째 열 때 레이아웃 지연 대응) */
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const priceData = useAppSelector(selectPriceByMarket(marketCode));
  const currentPrice = priceData?.tradePrice || null;

  const getDateRangeKey = useCallback((from: Date, to: Date): string => {
    return `${from.toISOString()}_${to.toISOString()}`;
  }, []);

  const getInitialDateRange = useCallback(() => {
    const now = new Date();
    // 초기 로드는 2017-01-01부터 현재 날짜까지 전체 조회
    const initialStartDate = MIN_DATE.toISOString().split('T')[0] + 'T00:00:00';
    earliestLoadedDateRef.current = MIN_DATE;
    return {
      startDate: initialStartDate,
      endDate: now.toISOString().split('T')[0] + 'T23:59:59',
    };
  }, []);

  const [dateRange] = useState(getInitialDateRange());

  const rangeKeyForQuery = useMemo(() => {
    return getDateRangeKey(
      new Date(dateRange.startDate),
      new Date(dateRange.endDate)
    );
  }, [dateRange.startDate, dateRange.endDate, getDateRangeKey]);

  // 초기 로드 트리거 (컴포넌트 마운트 시)
  useEffect(() => {
    if (coinId) {
      const initialRangeKey = rangeKeyForQuery;
      if (!loadedRangesRef.current.has(initialRangeKey) && 
          !loadingRangesRef.current.has(initialRangeKey) && 
          !pendingRangesRef.current.has(initialRangeKey)) {
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
        const result = await coinPriceService.getByDateRange(coinId, dateRange.startDate, dateRange.endDate);
        return result;
      } finally {
        loadingRangesRef.current.delete(key);
      }
    },
    enabled: shouldEnableQuery,
    staleTime: 1000 * 60 * 5,
  });

  const allChartData = useRef<Map<string, CoinPriceDayResponse>>(new Map());

  useEffect(() => {
    if (!isLoading && priceDataList && priceDataList.length > 0) {
      const rangeKey = getDateRangeKey(
        new Date(dateRange.startDate),
        new Date(dateRange.endDate)
      );
      
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
      const rangeKey = getDateRangeKey(
        new Date(dateRange.startDate),
        new Date(dateRange.endDate)
      );
      const requestStartDate = new Date(dateRange.startDate);
      if (!earliestLoadedDateRef.current || requestStartDate < earliestLoadedDateRef.current) {
        earliestLoadedDateRef.current = requestStartDate;
        endReachedRef.current = true;
      }
      loadedRangesRef.current.add(rangeKey);
      loadingRangesRef.current.delete(rangeKey);
      pendingRangesRef.current.delete(rangeKey);
    }

    if (chartRef.current && seriesRef.current && allChartData.current.size > 0) {
      const todayUtc = getTodayUtcString();
      const endDateUtc = dateRange.endDate.slice(0, 10);
      const rangeIncludesToday = endDateUtc >= todayUtc;

      let formattedData = Array.from(allChartData.current.values())
        .sort((a, b) => {
          const dateA = new Date(a.candleDateTimeUtc).getTime();
          const dateB = new Date(b.candleDateTimeUtc).getTime();
          return dateA - dateB;
        })
        .map((item) => {
          const timeString = item.candleDateTimeUtc.slice(0, 10);
          const isToday = timeString === todayUtc;
          if (isToday && priceData) {
            return { time: timeString as string, value: Number(priceData.tradePrice) };
          }
          return {
            time: timeString as string,
            value: Number(item.tradePrice),
          };
        });

      if (rangeIncludesToday && priceData && !formattedData.some((d) => d.time === todayUtc)) {
        formattedData = [...formattedData, { time: todayUtc as string, value: Number(priceData.tradePrice) }].sort(
          (a, b) => (a.time as string).localeCompare(b.time as string)
        );
      }

      seriesRef.current.setData(formattedData);
    }

  }, [priceDataList, dateRange, isLoading, priceData]);

  const checkAndLoadData = useCallback((visibleFrom: Date, visibleTo: Date) => {
    // 드래그 시 추가 조회 로직 제거 - 초기 로드에서 전체 데이터를 조회하므로 불필요
  }, []);

  // 컨테이너 크기 감지: 레이아웃 완료 후 크기가 잡히면 차트 생성 effect 재실행
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== container) continue;
        const { width, height } = entry.contentRect;
        setContainerSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
        break;
      }
    });
    ro.observe(container);
    // 운영 등에서 ResizeObserver가 0으로만 오거나 늦게 올 때 대비: 레이아웃 후 한 번 더 크기 보정
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!chartContainerRef.current) return;
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
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
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = containerSize.width || container.clientWidth;
    const height = containerSize.height || container.clientHeight;

    if (width === 0 || height === 0) return;

    const getCSSVariable = (variableName: string, defaultValue: string): string => {
      if (typeof window === 'undefined') return defaultValue;
      const computedStyle = getComputedStyle(container);
      const value = computedStyle.getPropertyValue(variableName).trim();
      return value || defaultValue;
    };

    const foregroundColor = getCSSVariable('--foreground', '#171717');
    const mainColor = getCSSVariable('--main-color', '#02a262');
    const isDarkMode = container.closest('.dark') !== null;
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const formatPrice = (price: number): string => {
      if (Math.abs(price) < 100) {
        return new Intl.NumberFormat('ko-KR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8,
        }).format(price);
      }
      return new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    if (!chartRef.current) {
      const chart = createChart(container, {
        width,
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: foregroundColor,
          fontSize: 9,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: {
          borderColor: borderColor,
        },
        timeScale: {
          borderColor: borderColor,
          timeVisible: true,
        },
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 2, // 대시선 (현재가 점선과 동일)
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: false,
          },
          horzLine: {
            visible: false,
            labelVisible: false,
            style: 2, // 대시선 (세로선과 동일)
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

      const lineSeries = chart.addLineSeries({
        color: mainColor,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => formatPrice(price),
        },
      });

      chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange) {
          const from = typeof timeRange.from === 'string' 
            ? new Date(timeRange.from) 
            : new Date((timeRange.from as number) * 1000);
          const to = typeof timeRange.to === 'string'
            ? new Date(timeRange.to)
            : new Date((timeRange.to as number) * 1000);
          setVisibleRange({ from, to });
          checkAndLoadData(from, to);
        }
      });

      chartRef.current = chart;
      seriesRef.current = lineSeries;
    }

    const chart = chartRef.current;
    const series = seriesRef.current;

    if (chart && series) {
      const currentMainColor = getCSSVariable('--main-color', '#02a262');
      
      series.applyOptions({
        color: currentMainColor,
      });

      const isDarkMode = container.closest('.dark') !== null;
      chart.applyOptions({
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 2, // 대시선 (현재가 점선과 동일)
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: true,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            style: 2, // 대시선 (세로선과 동일)
          },
        },
      });

      // 클릭 이벤트 핸들러
      const handleClick = (event: MouseEvent) => {
        if (!chart || !onDateClick) return;
        
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const coordinate = chart.timeScale().coordinateToTime(x);
        if (coordinate === null) {
          onDateClick(null);
          return;
        }

        // time을 문자열 형식으로 변환 (YYYY-MM-DD)
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

      container.addEventListener('click', handleClick);

      return () => {
        container.removeEventListener('click', handleClick);
      };
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          if (newWidth > 0 && newHeight > 0 && chartRef.current) {
            chartRef.current.applyOptions({ width: newWidth, height: newHeight });
          }
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [checkAndLoadData, containerSize.width, containerSize.height]);

  useEffect(() => {
    if (currentPrice !== null && seriesRef.current) {
      const mainColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--main-color')
        .trim() || '#02a262';
      
      if (currentPriceLineRef.current === null) {
        const priceLine = seriesRef.current.createPriceLine({
          price: currentPrice,
          color: mainColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '',
        });
        currentPriceLineRef.current = priceLine;
      } else {
        currentPriceLineRef.current.applyOptions({
          price: currentPrice,
          color: mainColor,
        });
      }
    }
  }, [currentPrice]);

  const hasNoData = !isLoading && (!priceDataList || priceDataList.length === 0);

  return (
    <div
      ref={chartContainerRef}
      className={containerClassName}
      style={{ position: 'relative', width: '100%' }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--foreground)',
            fontSize: '14px',
          }}
        >
          로딩 중...
        </div>
      )}
      {hasNoData && (
        <div className="coin-detail-chart-empty">
          지원하지 않는 종목입니다.
        </div>
      )}
    </div>
  );
}

