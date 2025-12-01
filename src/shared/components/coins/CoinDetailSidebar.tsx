'use client';

import { CoinResponse } from '@/features/coins/services/coinService';
import './CoinDetailSidebar.css';

interface CoinDetailSidebarProps {
  coin: CoinResponse | null;
  isClosing?: boolean;
  onClose: () => void;
}

export default function CoinDetailSidebar({ coin, isClosing = false, onClose }: CoinDetailSidebarProps) {
  if (!coin) return null;

  return (
    <div className="coin-detail-sidebar">
      <div className="coin-detail-sidebar-content">
        <div className="coin-detail-sidebar-header">
          <div className="coin-detail-sidebar-title-wrapper">
            <h2 className="coin-detail-sidebar-title">코인 상세 정보</h2>
          </div>
          <button
            className="coin-detail-sidebar-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="coin-detail-sidebar-body">
          {/* 여기에 상세 정보 내용이 들어갈 예정 */}
          <div className="coin-detail-info">
            <p>코인명: {coin.koreanName || coin.marketCode}</p>
            <p>마켓 코드: {coin.marketCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

