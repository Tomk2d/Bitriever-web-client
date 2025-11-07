'use client';

import type { AssetResponse } from '@/features/asset/types';
import { formatCurrency, formatNumber } from '@/features/asset/utils/assetCalculations';
import './RightSidebar.css';

interface WalletAssetListProps {
  assets: AssetResponse[];
}

export default function WalletAssetList({ assets }: WalletAssetListProps) {
  // KRW 제외한 코인만 필터링
  const coinAssets = assets.filter((asset) => asset.symbol !== 'KRW');

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
                {asset.coin?.koreanName || asset.symbol}
              </div>
              <div className="wallet-asset-name-symbol">{asset.symbol}</div>
            </div>
            <div className="wallet-asset-details">
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">평가 손익</span>
                <span className="wallet-asset-detail-value">{formatCurrency(profitLoss)}</span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">수익률</span>
                <span className="wallet-asset-detail-value">{profitRate}%</span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">보유 수량</span>
                <span className="wallet-asset-detail-value">
                  {formatNumber(asset.quantity || 0)} {asset.symbol}
                </span>
              </div>
              <div className="wallet-asset-detail-row">
                <span className="wallet-asset-detail-label">매수평균가</span>
                <span className="wallet-asset-detail-value">
                  {formatCurrency(asset.avgBuyPrice || 0)} 원
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

