'use client';

import { TradingStyleResponse } from '../types';
import { formatCurrency } from '@/features/asset/utils/assetCalculations';
import './TradingStyleCard.css';

interface TradingStyleCardProps {
  data: TradingStyleResponse;
}

export default function TradingStyleCard({ data }: TradingStyleCardProps) {
  const getTradingStyleLabel = (style: string) => {
    switch (style) {
      case 'SHORT_TERM':
        return '단타형';
      case 'MEDIUM_TERM':
        return '중기형';
      case 'LONG_TERM':
        return '장기형';
      default:
        return '미분류';
    }
  };

  return (
    <div className="trading-style-card">
      <div className="trading-style-header">
        <h3 className="trading-style-title">거래 스타일</h3>
        <div className="trading-style-badge">{getTradingStyleLabel(data.tradingStyle)}</div>
      </div>
      
      <div className="trading-style-stats">
        <div className="trading-style-stat-item">
          <span className="trading-style-stat-label">평균 거래 금액</span>
          <span className="trading-style-stat-value">
            {formatCurrency(data.averageTradeAmount)}
          </span>
        </div>
        <div className="trading-style-stat-item">
          <span className="trading-style-stat-label">평균 보유 기간</span>
          <span className="trading-style-stat-value">
            {data.averageHoldingPeriod.toFixed(1)}일
          </span>
        </div>
        <div className="trading-style-stat-item">
          <span className="trading-style-stat-label">최대 거래 금액</span>
          <span className="trading-style-stat-value">
            {formatCurrency(data.maxTradeAmount)}
          </span>
        </div>
        <div className="trading-style-stat-item">
          <span className="trading-style-stat-label">최소 거래 금액</span>
          <span className="trading-style-stat-value">
            {formatCurrency(data.minTradeAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
