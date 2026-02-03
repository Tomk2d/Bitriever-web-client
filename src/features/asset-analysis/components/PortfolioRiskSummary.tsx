'use client';

import { useState } from 'react';
import { RiskAnalysisResponse } from '../types';
import './PortfolioRiskSummary.css';

interface PortfolioRiskSummaryProps {
  data: RiskAnalysisResponse;
}

// 집중도 구간별 색상 (낮을수록 안전 → 높을수록 위험)
const CONCENTRATION_COLORS = {
  green: '#02a262',   // 0~20% 초록
  lightGreen: '#5cd85c', // 20~40% 연두
  yellow: '#f5c542',  // 40~60% 노랑
  orange: '#f0a030',  // 60~80% 주황
  red: '#dd3c44',     // 80~100% 빨강
} as const;

export default function PortfolioRiskSummary({ data }: PortfolioRiskSummaryProps) {
  const toPercent = (value: number) => Math.max(0, Math.min(100, value));

  // 집중도 0~100%를 초록→연두→노랑→주황→빨강 5구간으로 매핑
  const getConcentrationColor = (concentration: number) => {
    const c = toPercent(concentration);
    if (c < 20) return CONCENTRATION_COLORS.green;
    if (c < 40) return CONCENTRATION_COLORS.lightGreen;
    if (c < 60) return CONCENTRATION_COLORS.yellow;
    if (c < 80) return CONCENTRATION_COLORS.orange;
    return CONCENTRATION_COLORS.red;
  };

  // 다양성 0% = 빨강(위험), 100% = 초록(안전). 집중도와 반대 방향 5구간
  const getDiversityColor = (score: number) => {
    const s = toPercent(score);
    if (s < 20) return CONCENTRATION_COLORS.red;      // 0~20% 빨강
    if (s < 40) return CONCENTRATION_COLORS.orange;    // 20~40% 주황
    if (s < 60) return CONCENTRATION_COLORS.yellow;   // 40~60% 노랑
    if (s < 80) return CONCENTRATION_COLORS.lightGreen; // 60~80% 연두
    return CONCENTRATION_COLORS.green;                // 80~100% 초록
  };

  const getRiskLevel = (concentration: number) => {
    const c = toPercent(concentration);
    if (c < 20) return '매우 낮음';
    if (c < 40) return '낮음';
    if (c < 60) return '보통';
    if (c < 80) return '높음';
    return '매우 높음';
  };

  const getDiversityLevel = (score: number) => {
    const s = toPercent(score);
    if (s < 20) return '매우 낮음';
    if (s < 40) return '낮음';
    if (s < 60) return '보통';
    if (s < 80) return '높음';
    return '매우 높음';
  };

  const riskLevelLabel = getRiskLevel(data.top5CoinConcentration);
  const concentrationPercent = toPercent(data.top5CoinConcentration);
  const diversityScore = toPercent(data.diversityIndex * 100);
  const diversityLevelLabel = getDiversityLevel(diversityScore);
  const concentrationColor = getConcentrationColor(concentrationPercent);
  const diversityColor = getDiversityColor(diversityScore);

  const [showConcentrationTooltip, setShowConcentrationTooltip] = useState(false);
  const [showDiversityTooltip, setShowDiversityTooltip] = useState(false);

  return (
    <div className="portfolio-risk-summary">
      <div className="portfolio-risk-card">
        <div className="portfolio-risk-header">
          <span className="portfolio-risk-title">포트폴리오 집중도</span>
          <span className="portfolio-risk-level" style={{ color: concentrationColor }}>
            {riskLevelLabel}
          </span>
        </div>
        <div className="portfolio-risk-value-row">
          <span className="portfolio-risk-value">
            {concentrationPercent.toFixed(1)}%
          </span>
          <span className="portfolio-risk-subtext">상위 5개 코인 비중</span>
        </div>
        <div
          className="portfolio-risk-bar-wrapper"
          onMouseEnter={() => setShowConcentrationTooltip(true)}
          onMouseLeave={() => setShowConcentrationTooltip(false)}
        >
          <div className="portfolio-risk-bar-track">
            <div
              className="portfolio-risk-bar-fill"
              style={{ width: `${concentrationPercent}%`, backgroundColor: concentrationColor }}
            />
          </div>
          {showConcentrationTooltip && (
            <div className="portfolio-risk-tooltip">
              <div className="portfolio-risk-tooltip-name">포트폴리오 집중도</div>
              <div className="portfolio-risk-tooltip-desc">
                높을수록 소수 코인에 몰려 있어 변동성·리스크가 커질 수 있고, 낮을수록 분산된 편입니다.
                <span className="portfolio-risk-tooltip-formula">
                  상위 5개 코인 비중의 합
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="portfolio-risk-card">
        <div className="portfolio-risk-header">
          <span className="portfolio-risk-title">포트폴리오 다양성 지수</span>
          <span className="portfolio-risk-level" style={{ color: diversityColor }}>
            {diversityLevelLabel}
          </span>
        </div>
        <div className="portfolio-risk-value-row">
          <span className="portfolio-risk-value">
            {diversityScore.toFixed(1)}
          </span>
          <span className="portfolio-risk-subtext">상위 5개 코인 다양성</span>
        </div>
        <div
          className="portfolio-risk-bar-wrapper"
          onMouseEnter={() => setShowDiversityTooltip(true)}
          onMouseLeave={() => setShowDiversityTooltip(false)}
        >
          <div className="portfolio-risk-bar-track">
            <div
              className="portfolio-risk-bar-fill diversity"
              style={{ width: `${diversityScore}%`, backgroundColor: diversityColor }}
            />
          </div>
          {showDiversityTooltip && (
            <div className="portfolio-risk-tooltip">
              <div className="portfolio-risk-tooltip-name">포트폴리오 다양성 지수</div>
              <div className="portfolio-risk-tooltip-desc">
                높을수록 상위 코인들이 고르게 퍼져 있어 다양하고, 낮을수록 한두 코인에 집중된 편입니다.
                <span className="portfolio-risk-tooltip-formula">
                  1 − Σ(상위 5개 코인 비중²)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

