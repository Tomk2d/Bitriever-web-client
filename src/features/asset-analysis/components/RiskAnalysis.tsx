'use client';

import { RiskAnalysisResponse } from '../types';
import './RiskAnalysis.css';

interface RiskAnalysisProps {
  data: RiskAnalysisResponse;
}

export default function RiskAnalysis({ data }: RiskAnalysisProps) {
  const getRiskLevel = (concentration: number) => {
    if (concentration >= 80) return { level: '높음', color: 'var(--price-down)' };
    if (concentration >= 50) return { level: '보통', color: 'var(--price-up)' };
    return { level: '낮음', color: 'var(--price-up)' };
  };

  const riskLevel = getRiskLevel(data.top5CoinConcentration);

  return (
    <div className="risk-analysis">
      <div className="risk-section">
        <h3 className="risk-title">포트폴리오 집중도</h3>
        <div className="risk-concentration">
          <div className="risk-concentration-header">
            <span>상위 5개 코인 집중도</span>
            <span 
              className="risk-level"
              style={{ color: riskLevel.color }}
            >
              {riskLevel.level}
            </span>
          </div>
          <div className="risk-concentration-value">
            {data.top5CoinConcentration.toFixed(1)}%
          </div>
          <div className="risk-concentration-bar-wrapper">
            <div
              className="risk-concentration-bar"
              style={{ 
                width: `${data.top5CoinConcentration}%`,
                backgroundColor: riskLevel.color
              }}
            />
          </div>
        </div>
      </div>

      <div className="risk-section">
        <h3 className="risk-title">상위 코인별 비율</h3>
        <div className="risk-coin-list">
          {data.topCoinConcentrations.map((coin, index) => (
            <div key={index} className="risk-coin-item">
              <div className="risk-coin-name">{coin.symbol}</div>
              <div className="risk-coin-bar-wrapper">
                <div
                  className="risk-coin-bar"
                  style={{ width: `${coin.percentage}%` }}
                />
              </div>
              <div className="risk-coin-percentage">{coin.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="risk-section">
        <h3 className="risk-title">포트폴리오 다양성 지수</h3>
        <div className="risk-diversity">
          <div className="risk-diversity-value">
            {(data.diversityIndex * 100).toFixed(1)}
          </div>
          <div className="risk-diversity-bar-wrapper">
            <div
              className="risk-diversity-bar"
              style={{ width: `${data.diversityIndex * 100}%` }}
            />
          </div>
          <div className="risk-diversity-note">
            (0-100, 높을수록 다양함)
          </div>
        </div>
      </div>
    </div>
  );
}
