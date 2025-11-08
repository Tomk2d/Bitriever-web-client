'use client';

import { useMemo } from 'react';
import type { AssetResponse } from '@/features/asset/types';
import { formatCurrency, formatNumber } from '@/features/asset/utils/assetCalculations';
import './RightSidebar.css';

type SortOption = 'holdings' | 'profit-high' | 'profit-low' | 'name';

interface WalletAssetListProps {
  assets: AssetResponse[];
  sortOption?: SortOption;
}

export default function WalletAssetList({ assets, sortOption = 'holdings' }: WalletAssetListProps) {
  // KRW 제외한 코인만 필터링 및 정렬
  const coinAssets = useMemo(() => {
    const filtered = assets.filter((asset) => asset.symbol !== 'KRW');
    
    // 정렬 로직
    const sorted = [...filtered].sort((a, b) => {
      const buyAmountA = (a.avgBuyPrice || 0) * (a.quantity || 0);
      const buyAmountB = (b.avgBuyPrice || 0) * (b.quantity || 0);
      const profitRateA = 0; // 임시: 0%
      const profitRateB = 0; // 임시: 0%
      const nameA = (a.coin?.koreanName || a.symbol).toLowerCase();
      const nameB = (b.coin?.koreanName || b.symbol).toLowerCase();
      
      switch (sortOption) {
        case 'holdings':
          return buyAmountB - buyAmountA; // 보유금액 내림차순
        case 'profit-high':
          return profitRateB - profitRateA; // 수익률 내림차순
        case 'profit-low':
          return profitRateA - profitRateB; // 수익률 오름차순
        case 'name':
          return nameA.localeCompare(nameB, 'ko'); // 가나다순
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [assets, sortOption]);

  if (coinAssets.length === 0) {
    return (
      <div className="wallet-asset-list-empty">
        보유한 암호화폐가 없습니다.
      </div>
    );
  }

  return (
    <div className="wallet-asset-list">
      {coinAssets.map((asset) => {
        const buyAmount = (asset.avgBuyPrice || 0) * (asset.quantity || 0);
        const evaluationAmount = buyAmount; // 임시: 매수평균가 * 보유수량
        const profitLoss = asset.avgBuyPrice || 0; // 임시: 매수 평균가로 통일
        const profitRate = 0; // 임시: 0%

        return (
          <div key={asset.id} className="wallet-asset-item">
            <div className="wallet-asset-name">
              <div className="wallet-asset-name-korean">
                <span 
                  className="wallet-asset-name-text"
                  title={(asset.coin?.koreanName || asset.symbol).length > 14 ? (asset.coin?.koreanName || asset.symbol) : undefined}
                >
                  {(asset.coin?.koreanName || asset.symbol).slice(0, 14)}
                </span>
                <span className="wallet-asset-name-symbol">{asset.symbol}</span>
              </div>
              <div className="wallet-asset-name-details">
                <div className="wallet-asset-detail-row">
                  <span className="wallet-asset-detail-label">평가 손익</span>
                  <span className="wallet-asset-detail-value">{formatCurrency(profitLoss)}</span>
                </div>
                <div className="wallet-asset-detail-row">
                  <span className="wallet-asset-detail-label">수익률</span>
                  <span className="wallet-asset-detail-value">{profitRate}%</span>
                </div>
              </div>
            </div>
            <div className="wallet-asset-details">
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">보유 수량</span>
                <span className="wallet-asset-detail-value">
                  {formatNumber(asset.quantity || 0)} {asset.symbol}
                </span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">매수평균가</span>
                <span className="wallet-asset-detail-value">
                  {formatCurrency(asset.avgBuyPrice || 0)}
                </span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">평가금액</span>
                <span className="wallet-asset-detail-value">{formatCurrency(evaluationAmount)}</span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">매수금액</span>
                <span className="wallet-asset-detail-value">{formatCurrency(buyAmount)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

