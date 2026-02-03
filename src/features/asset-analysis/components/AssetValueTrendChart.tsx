'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { AssetValueTrendResponse } from '../types';
import './AssetValueTrendChart.css';

interface AssetValueTrendChartProps {
  data: AssetValueTrendResponse;
}

export default function AssetValueTrendChart({ data }: AssetValueTrendChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.dataPoints.length === 0) return;

    // CSS 변수를 실제 색상 값으로 변환
    const getComputedColor = (cssVar: string, fallback: string = '#000000') => {
      if (typeof window === 'undefined') return fallback;
      const root = document.documentElement;
      // var(--text-primary) -> --text-primary
      const varName = cssVar.replace(/var\(|\)/g, '').trim();
      const value = getComputedStyle(root).getPropertyValue(varName);
      return value.trim() || fallback;
    };

    const textColor = getComputedColor('--text-primary', '#333d4b');
    const borderColor = getComputedColor('--border-color', 'rgba(0, 0, 0, 0.1)');
    const priceUpColor = getComputedColor('--price-up', '#00c896');

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: borderColor },
        horzLines: { color: borderColor },
      },
    });

    const lineSeries = chart.addLineSeries({
      color: priceUpColor,
      lineWidth: 2,
    });

    const formattedData = data.dataPoints.map((point) => ({
      time: new Date(point.date).getTime() / 1000 as any,
      value: point.totalValue,
    }));

    lineSeries.setData(formattedData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [data]);

  if (data.dataPoints.length === 0) {
    return (
      <div className="asset-value-trend-chart-empty">
        <p>자산 가치 추이 데이터가 없습니다.</p>
      </div>
    );
  }

  return <div ref={chartContainerRef} className="asset-value-trend-chart" />;
}
