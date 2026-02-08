'use client';

import { ProfitDistributionResponse } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import './ProfitDistributionChart.css';

/**
 * ProfitDistributionChart - 수익률 분포 막대 차트
 * 
 * 라이브러리: Recharts
 * 선택 이유:
 * - 통일성: CoinHoldingChart와 동일한 라이브러리 사용으로 일관성 유지
 * - 가벼움: 번들 크기가 작고 성능이 우수함
 * - TypeScript 지원: 완벽한 타입 정의 제공
 * - 커스터마이징: BarChart, ReferenceLine, Tooltip을 쉽게 커스터마이징 가능
 * - 다크모드: CSS 변수를 활용한 테마 대응 용이
 */
interface ProfitDistributionChartProps {
  data: ProfitDistributionResponse;
}

interface ChartDataItem {
  rangeLabel: string;
  rangeStart: number;
  rangeEnd: number;
  count: number;
  ratio: number;
  isPositive: boolean;
}

export default function ProfitDistributionChart({ data }: ProfitDistributionChartProps) {
  if (data.totalSellCount === 0) {
    return (
      <div className="profit-distribution-chart profit-distribution-chart-empty-wrapper">
        <div className="profit-distribution-chart-empty">
          <p>매도 거래 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  // Recharts용 데이터 변환
  const chartData: ChartDataItem[] = data.profitRanges.map((range) => ({
    rangeLabel: `${range.rangeStart >= 0 ? '+' : ''}${range.rangeStart}%`,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
    count: range.count,
    ratio: data.totalSellCount > 0 ? (range.count / data.totalSellCount) * 100 : 0,
    isPositive: range.rangeStart >= 0,
  }));

  // CSS 변수에서 색상 가져오기 (클라이언트 사이드에서만)
  const getColor = (isPositive: boolean): string => {
    if (typeof window === 'undefined') {
      return isPositive ? '#dd3c44' : '#1375ec';
    }
    const rootStyle = getComputedStyle(document.documentElement);
    return isPositive
      ? rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44'
      : rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
  };

  // 커스텀 Tooltip 컴포넌트
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className="profit-distribution-tooltip">
          <div className="profit-distribution-tooltip-range">
            {data.rangeStart >= 0 ? '+' : ''}
            {data.rangeStart}% ~ {data.rangeEnd >= 0 ? '+' : ''}
            {data.rangeEnd}%
          </div>
          <div className="profit-distribution-tooltip-count">
            거래 수: <strong>{data.count}건</strong>
          </div>
          <div className="profit-distribution-tooltip-ratio">
            비율: <strong>{data.ratio.toFixed(1)}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  // 커스텀 XAxis Tick 컴포넌트
  const CustomXAxisTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="var(--text-secondary, rgba(121, 131, 140, 0.75))"
          fontSize={11}
          className="profit-distribution-xaxis-label"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  // 평균 수익률/손실률이 속한 구간 찾기
  // 구간은 [rangeStart, rangeEnd) 형태로 가정 (rangeEnd는 포함하지 않음)
  const findRangeForValue = (value: number): string | undefined => {
    const range = chartData.find(
      (d) => d.rangeStart <= value && d.rangeEnd > value
    );
    // 정확히 rangeEnd와 일치하는 경우도 포함 (마지막 구간의 경우)
    if (!range) {
      const exactEndRange = chartData.find((d) => d.rangeEnd === value);
      return exactEndRange?.rangeLabel;
    }
    return range?.rangeLabel;
  };

  // 평균 수익률이 속한 구간 찾기
  const avgProfitRangeLabel = data.averageProfitRate !== 0 ? findRangeForValue(data.averageProfitRate) : undefined;
  // 평균 손실률이 속한 구간 찾기
  const avgLossRangeLabel = data.averageLossRate !== 0 ? findRangeForValue(data.averageLossRate) : undefined;

  return (
    <div className="profit-distribution-chart">
      {/* 차트 영역 */}
      <div className="profit-distribution-chart-container">
        <ResponsiveContainer width="100%" height={330}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
            barCategoryGap="10%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-color, rgba(0, 0, 0, 0.1))"
              opacity={0.3}
            />
            <XAxis
              dataKey="rangeLabel"
              tick={<CustomXAxisTick />}
              axisLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tickLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
            />
            <YAxis
              label={{
                value: '거래 수',
                angle: -90,
                position: 'insideLeft',
                style: {
                  textAnchor: 'middle',
                  fill: 'var(--text-secondary, rgba(121, 131, 140, 0.75))',
                  fontSize: 12,
                },
              }}
              axisLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tickLine={{ stroke: 'var(--border-color, rgba(0, 0, 0, 0.1))' }}
              tick={{ fill: 'var(--text-secondary, rgba(121, 131, 140, 0.75))', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* 평균 수익률 기준선 */}
            {avgProfitRangeLabel && data.averageProfitRate !== 0 && (
              <ReferenceLine
                x={avgProfitRangeLabel}
                stroke={getColor(true)}
                strokeDasharray="3 3"
                strokeOpacity={0.6}
                label={{
                  value: `평균 ${data.averageProfitRate.toFixed(1)}%`,
                  position: 'top',
                  fill: getColor(true),
                  fontSize: 10,
                  fontWeight: 500,
                }}
              />
            )}
            {/* 평균 손실률 기준선 */}
            {avgLossRangeLabel && data.averageLossRate !== 0 && (
              <ReferenceLine
                x={avgLossRangeLabel}
                stroke={getColor(false)}
                strokeDasharray="3 3"
                strokeOpacity={0.6}
                label={{
                  value: `평균 ${data.averageLossRate.toFixed(1)}%`,
                  position: 'top',
                  fill: getColor(false),
                  fontSize: 10,
                  fontWeight: 500,
                }}
              />
            )}
            <Bar dataKey="count" radius={[4, 4, 0, 0]} className="profit-distribution-bar">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.isPositive)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 통계 정보 배지 - 한 줄에 4개: 평균 손실률, 최저 수익률, 평균 수익률, 최고 수익률 */}
      <div className="profit-distribution-stats-badges">
        <div className="profit-stat-badge">
          <span className="profit-stat-badge-label">평균 손실률</span>
          <span className="profit-stat-badge-value profit-stat-badge-negative">
            {data.averageLossRate.toFixed(2)}%
          </span>
        </div>
        <div className="profit-stat-badge">
          <span className="profit-stat-badge-label">최저 수익률</span>
          <span className="profit-stat-badge-value profit-stat-badge-negative">
            {data.minProfitRate.toFixed(2)}%
          </span>
        </div>
        <div className="profit-stat-badge">
          <span className="profit-stat-badge-label">평균 수익률</span>
          <span className="profit-stat-badge-value profit-stat-badge-positive">
            {data.averageProfitRate.toFixed(2)}%
          </span>
        </div>
        <div className="profit-stat-badge">
          <span className="profit-stat-badge-label">최고 수익률</span>
          <span className="profit-stat-badge-value profit-stat-badge-positive">
            {data.maxProfitRate.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
