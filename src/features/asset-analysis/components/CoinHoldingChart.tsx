'use client';

import { CoinHoldingResponse, CoinHolding } from '../types';
import { formatCurrency } from '@/features/asset/utils/assetCalculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './CoinHoldingChart.css';

/**
 * CoinHoldingChart - 코인별 보유 현황 도넛 차트
 * 
 * 라이브러리: Recharts
 * 선택 이유:
 * - 가벼움: 번들 크기가 작고 성능이 우수함
 * - TypeScript 지원: 완벽한 타입 정의 제공
 * - React 19 호환: 최신 React 버전과 호환
 * - 커스터마이징: 도넛 차트, tooltip, legend를 쉽게 커스터마이징 가능
 * - 다크모드: CSS 변수를 활용한 테마 대응 용이
 */
interface CoinHoldingChartProps {
  data: CoinHoldingResponse;
}

interface ChartDataItem {
  name: string;
  value: number;
  percentage: number;
  holdingValue: number;
  color: string;
}

export default function CoinHoldingChart({ data }: CoinHoldingChartProps) {
  if (data.holdings.length === 0) {
    return (
      <div className="coin-holding-chart coin-holding-chart-empty-wrapper">
        <div className="coin-holding-chart-empty">
          <p>보유 코인 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  // 상위 5개만 개별 표시, 나머지는 기타로 합산
  const sortedHoldings = [...data.holdings].sort((a, b) => b.holdingValue - a.holdingValue);
  const topHoldings = sortedHoldings.slice(0, 5);
  const otherHoldings = sortedHoldings.slice(5);
  const otherTotal = otherHoldings.reduce((sum, h) => sum + h.holdingValue, 0);
  const otherPercentage = otherHoldings.reduce((sum, h) => sum + h.percentage, 0);

  const displayHoldings = otherTotal > 0
    ? [
        ...topHoldings,
        {
          coin: null,
          holdingValue: otherTotal,
          percentage: otherPercentage,
          quantity: 0,
          avgBuyPrice: 0,
          currentPrice: 0,
          profit: 0,
          profitRate: 0,
          exchangeCode: 0,
          symbol: '기타',
        } as CoinHolding,
      ]
    : topHoldings;

  // 초록 계열 색상 팔레트 (다크모드에서도 잘 보이도록 조정)
  const colors = [
    '#10B981', // 1위: 밝은 그린 (메인 컬러)
    '#059669', // 2위: 중간 그린
    '#047857', // 3위: 진한 그린
    '#34D399', // 4위: 라이트 그린
    '#6EE7B7', // 5위: 파스텔 그린
    '#A7F3D0', // 기타: 옅은 그린
  ];

  // Recharts용 데이터 변환
  const chartData: ChartDataItem[] = displayHoldings.map((holding, index) => ({
    name: holding.coin?.koreanName || holding.coin?.symbol || '기타',
    value: holding.percentage,
    percentage: holding.percentage,
    holdingValue: holding.holdingValue,
    color: colors[index % colors.length],
  }));

  // 커스텀 Tooltip 컴포넌트
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataItem;
      return (
        <div className="coin-holding-tooltip">
          <div className="coin-holding-tooltip-name">{data.name}</div>
          <div className="coin-holding-tooltip-value">
            {formatCurrency(data.holdingValue)}
          </div>
          <div className="coin-holding-tooltip-percentage">
            {data.percentage.toFixed(1)}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="coin-holding-chart">
      <div className="coin-holding-pie-container">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              animationDuration={500}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="var(--card-background, var(--background))"
                  strokeWidth={2}
                  className="coin-holding-segment"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="coin-holding-legend">
        {chartData.map((data, index) => (
          <div key={`legend-${index}`} className="coin-holding-legend-item">
            <div
              className="coin-holding-legend-color"
              style={{ backgroundColor: data.color }}
            />
            <div className="coin-holding-legend-info">
              <div className="coin-holding-legend-name">{data.name}</div>
              <div className="coin-holding-legend-value">
                {formatCurrency(data.holdingValue)} ({data.percentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
