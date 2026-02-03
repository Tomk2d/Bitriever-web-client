'use client';

import { useState, MouseEvent } from 'react';
import { TradingFrequencyResponse } from '../types';
import './TradingFrequencyChart.css';

interface TradingFrequencyChartProps {
  data: TradingFrequencyResponse;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value: string;
}

export default function TradingFrequencyChart({ data }: TradingFrequencyChartProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const maxFrequency = Math.max(...hours.map(h => data.hourlyFrequency[h] || 0), 1);
  
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
  const maxDayCount = Math.max(...dayLabels.map((_, index) => data.dayOfWeekFrequency[index] || 0), 1);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    value: '',
  });

  const formatHourRange = (hour: number) => {
    const hh = hour.toString().padStart(2, '0');
    return `${hh}:00 ~ ${hh}:59`;
  };

  const showTooltip = (
    e: MouseEvent<HTMLDivElement>,
    title: string,
    value: string,
  ) => {
    setTooltip({
      visible: true,
      x: e.clientX + 12,
      y: e.clientY - 24,
      title,
      value,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div className="trading-frequency-chart">
      <div className="trading-frequency-section">
        <h3 className="trading-frequency-title">시간대별 거래 빈도</h3>
        <div className="trading-frequency-hourly">
          {hours.map(hour => {
            const count = data.hourlyFrequency[hour] || 0;
            const height = (count / maxFrequency) * 100;
            
            return (
              <div key={hour} className="trading-frequency-hour-item">
                <div className="trading-frequency-bar-wrapper">
                  <div
                    className="trading-frequency-bar"
                    style={{ height: `${height}%` }}
                    onMouseEnter={(e) =>
                      showTooltip(e, formatHourRange(hour), `${count}건`)
                    }
                    onMouseMove={(e) =>
                      showTooltip(e, formatHourRange(hour), `${count}건`)
                    }
                    onMouseLeave={hideTooltip}
                  />
                </div>
                <div className="trading-frequency-hour-label">{hour}</div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="trading-frequency-section">
        <h3 className="trading-frequency-title">요일별 거래 빈도</h3>
        <div className="trading-frequency-dayofweek">
          {dayLabels.map((day, index) => {
            const count = data.dayOfWeekFrequency[index] || 0;
            const height = (count / maxDayCount) * 100;
            
            return (
              <div key={index} className="trading-frequency-day-item">
                <div className="trading-frequency-bar-wrapper">
                  <div
                    className="trading-frequency-bar"
                    style={{ height: `${height}%` }}
                    onMouseEnter={(e) =>
                      showTooltip(e, `${day}요일`, `${count}건`)
                    }
                    onMouseMove={(e) =>
                      showTooltip(e, `${day}요일`, `${count}건`)
                    }
                    onMouseLeave={hideTooltip}
                  />
                </div>
                <div className="trading-frequency-day-label">{day}</div>
              </div>
            );
          })}
        </div>
      </div>
      {tooltip.visible && (
        <div
          className="trading-frequency-tooltip-wrapper"
          style={{ top: tooltip.y, left: tooltip.x }}
        >
          <div className="profit-distribution-tooltip">
            <div className="profit-distribution-tooltip-range">
              {tooltip.title}
            </div>
            <div className="profit-distribution-tooltip-count">
              거래 수: <strong>{tooltip.value}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
