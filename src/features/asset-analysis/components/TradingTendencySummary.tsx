'use client';

import { TradingTendencySummaryResponse } from '../types';
import './TradingTendencySummary.css';

interface TradingTendencySummaryProps {
  data: TradingTendencySummaryResponse;
}

const tradingStyleLabels: Record<string, string> = {
  SHORT_TERM: '단타형',
  MEDIUM_TERM: '중기형',
  LONG_TERM: '장기형',
};

const riskTendencyLabels: Record<string, string> = {
  CONSERVATIVE: '보수형',
  MODERATE: '중립형',
  AGGRESSIVE: '공격형',
};

const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];

export default function TradingTendencySummary({ data }: TradingTendencySummaryProps) {
  return (
    <div className="trading-tendency-summary">
      <div className="tendency-section">
        <div className="tendency-item">
          <span className="tendency-label">거래 스타일</span>
          <span className="tendency-value">
            {tradingStyleLabels[data.tradingStyle] || data.tradingStyle}
          </span>
        </div>
        <div className="tendency-item">
          <span className="tendency-label">리스크 성향</span>
          <span className="tendency-value">
            {riskTendencyLabels[data.riskTendency] || data.riskTendency}
          </span>
        </div>
        <div className="tendency-item">
          <span className="tendency-label">선호 거래 시간대</span>
          <span className="tendency-value">
            {data.preferredTradingHour !== null ? `${data.preferredTradingHour}시` : '-'}
          </span>
        </div>
        <div className="tendency-item">
          <span className="tendency-label">선호 거래 요일</span>
          <span className="tendency-value">
            {data.preferredTradingDay !== null 
              ? `${dayLabels[data.preferredTradingDay]}요일` 
              : '-'}
          </span>
        </div>
      </div>

      <div className="tendency-section">
        <div className="tendency-item">
          <span className="tendency-label">주요 거래소</span>
          <span className="tendency-value">{data.primaryExchange}</span>
        </div>
        <div className="tendency-item">
          <span className="tendency-label">선호 코인 카테고리</span>
          <span className="tendency-value">
            {data.preferredCoinCategories.length > 0
              ? data.preferredCoinCategories.join(', ')
              : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
