'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, IPriceLine } from 'lightweight-charts';
import { coinPriceService } from '@/features/coins/services/coinPriceService';
import { calculateChartDateRange } from '@/shared/utils/dateUtils';

interface CoinPriceCandleChartProps {
  coinId: number;
  selectedDate: string;
  tradingPrice: number;
  isBuy: boolean;
  avgBuyPrice: number | null;
  containerClassName?: string;
}

export default function CoinPriceCandleChart({
  coinId,
  selectedDate,
  tradingPrice,
  isBuy,
  avgBuyPrice,
  containerClassName = '',
}: CoinPriceCandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const avgBuyPriceLineRef = useRef<IPriceLine | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const dateRange = useMemo(() => {
    return calculateChartDateRange(selectedDate, 6);
  }, [selectedDate]);

  const { data: priceData = [], isLoading, error } = useQuery({
    queryKey: ['coin-price-day', coinId, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      return coinPriceService.getByDateRange(coinId, dateRange.startDate, dateRange.endDate);
    },
    enabled: !!coinId && !!selectedDate,
    staleTime: 1000 * 60 * 5,
  });

  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0) {
      return [];
    }

    return priceData
      .sort((a, b) => {
        const dateA = new Date(a.candleDateTimeKst).getTime();
        const dateB = new Date(b.candleDateTimeKst).getTime();
        return dateA - dateB;
      })
      .map((item) => {
        const date = new Date(item.candleDateTimeKst);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const timeString = `${year}-${month}-${day}`;

        return {
          time: timeString as string,
          open: Number(item.openingPrice),
          high: Number(item.highPrice),
          low: Number(item.lowPrice),
          close: Number(item.tradePrice),
        };
      });
  }, [priceData]);

  const priceDataMap = useMemo(() => {
    if (!priceData || priceData.length === 0) {
      return new Map<string, typeof priceData[0]>();
    }

    const map = new Map<string, typeof priceData[0]>();
    priceData.forEach((item) => {
      const date = new Date(item.candleDateTimeKst);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const timeString = `${year}-${month}-${day}`;
      map.set(timeString, item);
    });
    return map;
  }, [priceData]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

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
          timeVisible: false,
        },
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 0,
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: false,
          },
          horzLine: {
            visible: false,
            labelVisible: false,
          },
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: false,
          pinch: false,
          mouseWheel: false,
          axisDoubleClickReset: false,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#ef4444',
        downColor: '#3b82f6',
        borderVisible: false,
        wickUpColor: '#ef4444',
        wickDownColor: '#3b82f6',
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => formatPrice(price),
        },
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
    }

    const chart = chartRef.current;
    const series = seriesRef.current;

    if (chart && series) {
      const foregroundColor = getCSSVariable('--foreground', '#171717');
      const mainColor = getCSSVariable('--main-color', '#02a262');
      const isDarkMode = container.closest('.dark') !== null;
      const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

      chart.applyOptions({
        layout: {
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
          timeVisible: false,
        },
        crosshair: {
          mode: 0,
          vertLine: {
            visible: true,
            style: 0,
            width: 1,
            color: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
            labelVisible: false,
          },
          horzLine: {
            visible: false,
            labelVisible: false,
          },
        },
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: false,
          horzTouchDrag: false,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: false,
          pinch: false,
          mouseWheel: false,
          axisDoubleClickReset: false,
        },
      });

      series.applyOptions({
        upColor: '#ef4444',
        downColor: '#3b82f6',
        borderVisible: false,
        wickUpColor: '#ef4444',
        wickDownColor: '#3b82f6',
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => formatPrice(price),
        },
      });

      // Trading Price Line (Sell/Buy Line)
      if (tradingPrice > 0) {
        const priceLineColor = isBuy ? '#ef4444' : '#3b82f6';
        if (priceLineRef.current) {
          priceLineRef.current.applyOptions({
            price: tradingPrice,
            color: priceLineColor,
            axisLabelVisible: true,
            title: '',
          });
        } else {
          priceLineRef.current = series.createPriceLine({
            price: tradingPrice,
            color: priceLineColor,
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: '',
          });
        }
      } else {
        if (priceLineRef.current) {
          series.removePriceLine(priceLineRef.current);
          priceLineRef.current = null;
        }
      }

      // Average Buy Price Line (only for Sell trades with avgBuyPrice)
      if (!isBuy && avgBuyPrice && avgBuyPrice > 0) {
        if (avgBuyPriceLineRef.current) {
          avgBuyPriceLineRef.current.applyOptions({
            price: avgBuyPrice,
            color: '#ef4444',
            axisLabelVisible: true,
            title: '',
          });
        } else {
          avgBuyPriceLineRef.current = series.createPriceLine({
            price: avgBuyPrice,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: '',
          });
        }
      } else {
        if (avgBuyPriceLineRef.current) {
          series.removePriceLine(avgBuyPriceLineRef.current);
          avgBuyPriceLineRef.current = null;
        }
      }

      if (chartData.length > 0) {
        series.setData(chartData);

        const firstTime = chartData[0].time;
        const lastTime = chartData[chartData.length - 1].time;

        const firstDate = new Date(firstTime);
        const lastDate = new Date(lastTime);

        const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        const paddingDays = Math.max(60, Math.floor(totalDays * 0.5));

        const startDate = new Date(firstDate);
        startDate.setDate(startDate.getDate() - paddingDays);

        const endDate = new Date(lastDate);
        endDate.setDate(endDate.getDate() + paddingDays);

        const startTimeString = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endTimeString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        chart.timeScale().setVisibleRange({
          from: startTimeString as any,
          to: endTimeString as any,
        });
      }

      const formatPriceForTooltip = (price: number): string => {
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

      const formatDateForTooltip = (dateString: string): string => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (!tooltipRef.current) {
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
          position: absolute;
          display: none;
          padding: 8px 12px;
          background-color: rgba(0, 0, 0, 0.5);
          color: #ffffff;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'Pretendard', sans-serif;
          pointer-events: none;
          z-index: 1000;
          white-space: nowrap;
        `;
        container.style.position = 'relative';
        container.appendChild(tooltip);
        tooltipRef.current = tooltip;
      }

      const tooltip = tooltipRef.current;

      chart.subscribeCrosshairMove((param) => {
        if (!tooltip || !param.point) {
          tooltip.style.display = 'none';
          return;
        }

        const time = param.time as string;
        if (!time) {
          tooltip.style.display = 'none';
          return;
        }

        const data = priceDataMap.get(time);
        if (!data) {
          tooltip.style.display = 'none';
          return;
        }

        const rect = container.getBoundingClientRect();
        const x = param.point.x;
        const y = param.point.y;

        tooltip.innerHTML = `
          <div style="margin-bottom: 4px; font-weight: 600;">${formatDateForTooltip(data.candleDateTimeKst)}</div>
          <div style="margin-bottom: 2px;">시가: ${formatPriceForTooltip(Number(data.openingPrice))}</div>
          <div style="margin-bottom: 2px;">고가: ${formatPriceForTooltip(Number(data.highPrice))}</div>
          <div style="margin-bottom: 2px;">저가: ${formatPriceForTooltip(Number(data.lowPrice))}</div>
          <div>종가: ${formatPriceForTooltip(Number(data.tradePrice))}</div>
        `;

        tooltip.style.display = 'block';
        tooltip.style.left = `${x + 10}px`;
        tooltip.style.top = `${y - tooltip.offsetHeight / 2}px`;

        if (x + tooltip.offsetWidth > rect.width) {
          tooltip.style.left = `${x - tooltip.offsetWidth - 10}px`;
        }
        if (y + tooltip.offsetHeight / 2 > rect.height) {
          tooltip.style.top = `${rect.height - tooltip.offsetHeight - 10}px`;
        }
        if (y - tooltip.offsetHeight / 2 < 0) {
          tooltip.style.top = '10px';
        }
      });
    }

    const handleResize = () => {
      if (container && chartRef.current) {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        if (newWidth > 0 && newHeight > 0) {
          chartRef.current.applyOptions({
            width: newWidth,
            height: newHeight,
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (tooltipRef.current && container.contains(tooltipRef.current)) {
        container.removeChild(tooltipRef.current);
        tooltipRef.current = null;
      }
      if (priceLineRef.current && seriesRef.current) {
        seriesRef.current.removePriceLine(priceLineRef.current);
        priceLineRef.current = null;
      }
      if (avgBuyPriceLineRef.current && seriesRef.current) {
        seriesRef.current.removePriceLine(avgBuyPriceLineRef.current);
        avgBuyPriceLineRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [chartData, tradingPrice, isBuy, avgBuyPrice, priceDataMap]);

  if (isLoading) {
    return (
      <div
        ref={chartContainerRef}
        className={containerClassName}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
        }}
      >
        <span style={{ color: 'var(--foreground, #000000)' }}>로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={chartContainerRef}
        className={containerClassName}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
        }}
      >
        <span style={{ color: 'var(--foreground, #000000)' }}>차트를 불러올 수 없습니다.</span>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div
        ref={chartContainerRef}
        className={containerClassName}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px',
        }}
      >
        <span style={{ color: 'var(--foreground, #000000)' }}>데이터가 없습니다.</span>
      </div>
    );
  }

  return <div ref={chartContainerRef} className={containerClassName} />;
}

