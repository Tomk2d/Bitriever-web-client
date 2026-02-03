'use client';

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAllPrices } from '@/store/slices/coinPriceSlice';
import { SummaryMetrics } from '../types';
import {
  formatCurrency,
  formatNumber,
  getKRWAsset,
} from '@/features/asset/utils/assetCalculations';
import { useAssets } from '@/features/asset/hooks/useAssets';
import './SummaryCards.css';

interface SummaryCardsProps {
  metrics: SummaryMetrics;
}

export default function SummaryCards({ metrics }: SummaryCardsProps) {
  const { data: assets = [] } = useAssets(true);
  const priceData = useAppSelector(selectAllPrices);

  // RightSidebar와 동일한 방식으로 총 자산 평가액 계산
  const computedTotalAssetsValue = useMemo(() => {
    if (!assets || assets.length === 0) return null;

    const totalEvaluationAmount = assets
      .filter((asset) => asset.symbol !== 'KRW')
      .reduce((total, asset) => {
        const marketCode = asset.coin?.marketCode;
        if (!marketCode) return total;
        const currentPrice = priceData[marketCode]?.tradePrice || 0;
        return total + currentPrice * (asset.quantity || 0);
      }, 0);

    const krwAsset = getKRWAsset(assets);
    const krwValue = krwAsset ? krwAsset.quantity || 0 : 0;

    return krwValue + totalEvaluationAmount;
  }, [assets, priceData]);

  const formatWinRate = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getWinRateColor = (value: number) => {
    if (value < 20) return '#A7F3D0'; // 가장 옅은 초록
    if (value < 40) return '#6EE7B7';
    if (value < 60) return '#34D399';
    if (value < 80) return '#10B981';
    if (value < 100) return '#047857';
    return '#064E3B'; // 100%에 가까운 진한 초록
  };

  const getProfitColor = (value: number) => {
    return value >= 0 ? 'var(--price-up)' : 'var(--price-down)';
  };

  const totalAssetValueToShow =
    computedTotalAssetsValue !== null ? computedTotalAssetsValue : metrics.totalAssetValue;

  const cards = [
    {
      title: '총 자산 가치',
      value: formatCurrency(totalAssetValueToShow),
      subtitle: '보유 중인 자산 총액',
      color: 'var(--text-primary)',
    },
    {
      title: '누적 수익 금액',
      value: formatCurrency(metrics.totalProfit),
      subtitle: '누적 수익 실현 금액',
      color: getProfitColor(metrics.totalProfit),
    },
    {
      title: '누적 승률',
      value: formatWinRate(metrics.winRate),
      subtitle: '수익실현 / 전체거래',
      color: 'var(--text-primary)',
    },
    {
      title: '총 거래 횟수',
      value: `${formatNumber(metrics.totalTradeCount)} 회`,
      subtitle: '매수 + 매도 횟수',
      color: 'var(--text-primary)',
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card, index) => (
        <div key={index} className="summary-card">
          <div className="summary-card-content">
            <div className="summary-card-title">{card.title}</div>
            <div className="summary-card-value" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="summary-card-subtitle">{card.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
