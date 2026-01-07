'use client';

import { useEffect, useState } from 'react';
import { EconomicIndexResponse } from '@/features/economicIndex/types';

interface MarketIndicatorChartProps {
  data: EconomicIndexResponse[];
  isPositive: boolean;
}

export default function MarketIndicatorChart({
  data,
  isPositive,
}: MarketIndicatorChartProps) {
  const [backgroundColor, setBackgroundColor] = useState<string>('transparent');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--background').trim() || '#ffffff';
      setBackgroundColor(bgColor);
    }
  }, []);

  if (!data || data.length === 0) {
    return (
      <div
        className="coin-list-market-indicator-chart"
        style={{ width: '90%', height: '60px' }}
      />
    );
  }

  // 5분 단위 데이터이므로 dateTimeString(또는 dateTime)에 시간 정보가 포함되어 있음
  const sorted = [...data].sort((a, b) => {
    const timeA = a.dateTimeString
      ? new Date(a.dateTimeString).getTime()
      : new Date(a.dateTime).getTime();
    const timeB = b.dateTimeString
      ? new Date(b.dateTimeString).getTime()
      : new Date(b.dateTime).getTime();
    return timeA - timeB;
  });

  const values = sorted.map((d) => Number(d.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // SVG 좌표계 (0~100, 0~40) 기준으로 포인트 계산
  const height = 40;
  const paddingTop = 4;
  const paddingBottom = 4;
  const drawableHeight = height - paddingTop - paddingBottom;

  const points = sorted.map((d, index) => {
    const x =
      sorted.length === 1
        ? 50
        : (index / (sorted.length - 1)) * 100;
    const normalized = (Number(d.price) - min) / range;
    const y = height - paddingBottom - normalized * drawableHeight;
    return { x, y };
  });

  const linePath = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'}${p.x},${p.y}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  // 전역 색상 규칙을 따라감:
  // 상승: var(--price-up) (빨간 계열), 하락: var(--price-down) (파란 계열)
  const strokeColor = isPositive
    ? 'var(--price-up, #ef4444)'
    : 'var(--price-down, #3b82f6)';

  const fillColor = isPositive
    ? 'rgba(239, 68, 68, 0.35)'   // 빨간 계열 연한 버전
    : 'rgba(59, 130, 246, 0.35)'; // 파란 계열 연한 버전

  const gradientId = isPositive
    ? 'market-indicator-gradient-up'
    : 'market-indicator-gradient-down';

  return (
    <div
      className="coin-list-market-indicator-chart"
      style={{ width: '90%', height: '50px' }}
    >
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 웹사이트 배경색과 동일한 배경 */}
        <rect
          x="0"
          y="0"
          width="100"
          height="40"
          fill={backgroundColor}
        />
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

