'use client';

import { useMemo } from 'react';
import type { AssetResponse } from '@/features/asset/types';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { formatCurrency, formatNumber, formatQuantity } from '@/features/asset/utils/assetCalculations';
import './RightSidebar.css';

type SortOption = 'holdings' | 'profit-high' | 'profit-low' | 'name';

interface WalletAssetListProps {
  assets: AssetResponse[];
  sortOption?: SortOption;
}

export default function WalletAssetList({ assets, sortOption = 'holdings' }: WalletAssetListProps) {
  // Redux에서 가격 데이터 가져오기
  const priceData = useAppSelector((state) => state.coinPrice.prices);
  
  // KRW 제외한 코인만 필터링 및 정렬
  const coinAssets = useMemo(() => {
    const filtered = assets.filter((asset) => asset.symbol !== 'KRW');
    
    // 정렬 로직
    const sorted = [...filtered].sort((a, b) => {
      // 현재가 * 보유수량으로 평가금액 계산
      const marketCodeA = a.coin?.marketCode;
      const marketCodeB = b.coin?.marketCode;
      const currentPriceA = marketCodeA ? (priceData[marketCodeA]?.tradePrice || 0) : 0;
      const currentPriceB = marketCodeB ? (priceData[marketCodeB]?.tradePrice || 0) : 0;
      const evaluationAmountA = currentPriceA * (a.quantity || 0);
      const evaluationAmountB = currentPriceB * (b.quantity || 0);
      
      // 수익률 계산
      const avgBuyPriceA = a.avgBuyPrice || 0;
      const avgBuyPriceB = b.avgBuyPrice || 0;
      const profitRateA = avgBuyPriceA > 0 ? ((currentPriceA - avgBuyPriceA) / avgBuyPriceA) * 100 : 0;
      const profitRateB = avgBuyPriceB > 0 ? ((currentPriceB - avgBuyPriceB) / avgBuyPriceB) * 100 : 0;
      
      const nameA = (a.coin?.koreanName || a.symbol).toLowerCase();
      const nameB = (b.coin?.koreanName || b.symbol).toLowerCase();
      
      switch (sortOption) {
        case 'holdings':
          return evaluationAmountB - evaluationAmountA; // 평가금액 내림차순
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
  }, [assets, sortOption, priceData]);

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
        const marketCode = asset.coin?.marketCode;
        const priceDataForAsset = marketCode ? priceData[marketCode] : null;
        
        // 현재가 (Redux에서 가져오기)
        const currentPrice = priceDataForAsset?.tradePrice || 0;
        
        // 현재가 * 보유수량 (평가금액)
        const evaluationAmount = currentPrice * (asset.quantity || 0);
        
        // 매수평균가 * 보유수량 (총평가금액)
        const buyAmount = (asset.avgBuyPrice || 0) * (asset.quantity || 0);
        
        // 평가 손익 = 평가금액 - 총평가금액
        const profitLoss = evaluationAmount - buyAmount;
        
        // 수익률 = (현재가 - 매수평균가) / 매수평균가 * 100
        const avgBuyPrice = asset.avgBuyPrice || 0;
        const profitRate = avgBuyPrice > 0 ? ((currentPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0;

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
                <span className="wallet-asset-name-symbol">
                  {asset.coin?.marketCode || `${asset.tradeBySymbol}-${asset.symbol}`}
                </span>
              </div>
              <div className="wallet-asset-name-details">
                <div className="wallet-asset-detail-row">
                  <span className="wallet-asset-detail-label">평가 손익</span>
                  <span 
                    className="wallet-asset-detail-value"
                    style={{ color: profitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
                  >
                    {formatCurrency(profitLoss)}
                  </span>
                </div>
                <div className="wallet-asset-detail-row">
                  <span className="wallet-asset-detail-label">수익률</span>
                  <span 
                    className="wallet-asset-detail-value"
                    style={{ color: profitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
                  >
                    {profitRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="wallet-asset-details">
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">보유 수량</span>
                <span className="wallet-asset-detail-value">
                  {formatQuantity(asset.quantity || 0)} {asset.symbol}
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
                <span 
                  className="wallet-asset-detail-value"
                  style={{ color: profitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
                >
                  {evaluationAmount > 0 ? formatCurrency(evaluationAmount) : '-'}
                </span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">총매수금액</span>
                <span className="wallet-asset-detail-value">{formatCurrency(buyAmount)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

