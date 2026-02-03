'use client';

import { ExchangeUsageResponse } from '../types';
import './ExchangeUsageChart.css';

interface ExchangeUsageChartProps {
  data: ExchangeUsageResponse;
}

export default function ExchangeUsageChart({ data }: ExchangeUsageChartProps) {
  if (data.exchangeStats.length === 0) {
    return (
      <div className="exchange-usage-chart-empty">
        <p>거래소 사용 데이터가 없습니다.</p>
      </div>
    );
  }

  const totalTrades = data.exchangeStats.reduce((sum, stat) => sum + stat.tradeCount, 0);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="exchange-usage-chart">
      <div className="exchange-usage-pie">
        {data.exchangeStats.map((stat, index) => {
          const percentage = totalTrades > 0 ? (stat.tradeCount / totalTrades) * 100 : 0;
          const startAngle = data.exchangeStats
            .slice(0, index)
            .reduce((sum, s) => sum + (s.tradeCount / totalTrades) * 360, 0);
          const angle = (stat.tradeCount / totalTrades) * 360;
          
          return (
            <div key={stat.exchangeCode} className="exchange-usage-item">
              <div 
                className="exchange-usage-color" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="exchange-usage-info">
                <div className="exchange-usage-name">{stat.exchangeName}</div>
                <div className="exchange-usage-details">
                  <span>{stat.tradeCount}건</span>
                  <span>({percentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
