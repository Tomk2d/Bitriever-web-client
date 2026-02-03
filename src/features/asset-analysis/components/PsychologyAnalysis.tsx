'use client';

import { PsychologyAnalysisResponse } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import './PsychologyAnalysis.css';

interface PsychologyAnalysisProps {
  data: PsychologyAnalysisResponse;
}

const mindLabels: Record<string, string> = {
  MINDLESS: '무념무상',
  CONFIDENT: '확신',
  SOMEWHAT_CONFIDENT: '약간 확신',
  EXPECTATION: '기대감',
  GREED: '욕심',
  IMPATIENCE: '조급함',
  ANXIETY: '불안',
  FEAR: '두려움',
};

// 매매일지에서 사용하는 심리 상태 색상과 동일하게 매핑
const mindColors: Record<string, string> = {
  MINDLESS: '#6b7280', // 무념무상 - 회색
  CONFIDENT: '#10b981', // 확신 - 초록색
  SOMEWHAT_CONFIDENT: '#84cc16', // 약간 확신 - 연두색
  EXPECTATION: '#3b82f6', // 기대감 - 파란색
  GREED: '#f59e0b', // 욕심 - 주황색
  IMPATIENCE: '#ef4444', // 조급함 - 빨간색
  ANXIETY: '#8b5cf6', // 불안 - 보라색
  FEAR: '#6366f1', // 두려움 - 인디고
};

interface MindChartItem {
  name: string;
  count: number;
  percentage: number;
  avgProfitRate: number;
  color: string;
}

export default function PsychologyAnalysis({ data }: PsychologyAnalysisProps) {
  const entries = Object.entries(data.mindDistribution);
  const totalMinds = entries.reduce((sum, [, count]) => sum + count, 0);

  if (entries.length === 0 || totalMinds === 0) {
    return (
      <div className="psychology-analysis">
        <div className="psychology-section">
          <h3 className="psychology-title">심리 상태 분포</h3>
          <div className="psychology-empty-wrapper">
            <p className="psychology-empty-text">심리 데이터가 없습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  // 원하는 표시 순서: 확신 - 약간 확신 - 기대감 - 두려움 - 불안 - 조급함 - 무념무상
  const mindOrder = [
    'CONFIDENT',
    'SOMEWHAT_CONFIDENT',
    'EXPECTATION',
    'FEAR',
    'ANXIETY',
    'IMPATIENCE',
    'MINDLESS',
  ];

  const sortedEntries = [...entries].sort(([mindA], [mindB]) => {
    const indexA = mindOrder.indexOf(mindA);
    const indexB = mindOrder.indexOf(mindB);
    const safeIndexA = indexA === -1 ? mindOrder.length + 1 : indexA;
    const safeIndexB = indexB === -1 ? mindOrder.length + 1 : indexB;
    return safeIndexA - safeIndexB;
  });

  const chartData: MindChartItem[] = sortedEntries.map(([mind, count], index) => {
    const percentage = (count / totalMinds) * 100;
    const avgProfitRate = data.mindAverageProfitRate[mind] || 0;

    return {
      name: mindLabels[mind] || mind,
      count,
      percentage,
      avgProfitRate,
      color: mindColors[mind] || '#10B981',
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as MindChartItem;
      return (
        <div className="coin-holding-tooltip">
          <div className="coin-holding-tooltip-name">{item.name}</div>
          <div className="coin-holding-tooltip-value">{item.count}건</div>
          <div className="coin-holding-tooltip-percentage">
            평균 수익률:{' '}
            {item.avgProfitRate >= 0 ? '+' : ''}
            {item.avgProfitRate.toFixed(2)}%
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="psychology-analysis">
      <div className="psychology-section">
        <h3 className="psychology-title">심리 상태 분포</h3>
        <div className="coin-holding-chart psychology-mind-chart">
          <div className="coin-holding-pie-container psychology-mind-pie-container">
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={150}
                  innerRadius={90}
                  dataKey="percentage"
                  startAngle={90}
                  endAngle={-270}
                  animationDuration={500}
                  animationBegin={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`mind-cell-${index}`}
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
            {chartData.map((item, index) => (
              <div
                key={`mind-legend-${index}`}
                className="coin-holding-legend-item"
              >
                <div
                  className="coin-holding-legend-color"
                  style={{ backgroundColor: item.color }}
                />
                <div className="coin-holding-legend-info">
                  <div className="coin-holding-legend-name">{item.name}</div>
                  <div className="coin-holding-legend-value">
                    {item.count}건 / 평균 수익률{' '}
                    {item.avgProfitRate >= 0 ? '+' : ''}
                    {item.avgProfitRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
