'use client';

import { useState } from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import './CoinItem.css';

interface CoinItemProps {
  coin: CoinResponse;
  rank: number;
}

export default function CoinItem({ coin, rank }: CoinItemProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  // 일단 가격, 등락율, 거래대금은 0으로 설정
  const price = 0;
  const changeRate = 0;
  const tradingVolume = 0;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const formatPrice = (value: number) => {
    if (value === 0) return '0';
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const formatChangeRate = (rate: number) => {
    if (rate === 0) return '0.00%';
    const sign = rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(2)}%`;
  };

  const formatTradingVolume = (volume: number) => {
    if (volume === 0) return '0원';
    if (volume >= 100000000) {
      return `${(volume / 100000000).toFixed(0)}억원`;
    }
    if (volume >= 10000) {
      return `${(volume / 10000).toFixed(0)}만원`;
    }
    return `${formatPrice(volume)}원`;
  };

  const changeRateColor = changeRate > 0 ? '#f04251' : changeRate < 0 ? '#449bff' : 'var(--foreground)';

  return (
    <div className="coin-item">
      <div className="coin-item-section coin-item-info">
        <button
          className={`coin-item-favorite ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? '관심종목 해제' : '관심종목 설정'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
        <div className="coin-item-rank">{rank}</div>
        {coin.imgUrl ? (
          <img
            src={coin.imgUrl}
            alt={coin.koreanName || coin.marketCode}
            className="coin-item-logo"
          />
        ) : (
          <div className="coin-item-logo-placeholder" />
        )}
        <div className="coin-item-name-container">
          <div className="coin-item-name">
            {coin.koreanName || coin.marketCode}
          </div>
          <div className="coin-item-market-code">
            {coin.marketCode}
          </div>
        </div>
      </div>
      <div className="coin-item-section coin-item-price">
        <span className="coin-item-price-value">{formatPrice(price)}원</span>
      </div>
      <div className="coin-item-section coin-item-change">
        <span className="coin-item-change-value" style={{ color: changeRateColor }}>
          {formatChangeRate(changeRate)}
        </span>
      </div>
      <div className="coin-item-section coin-item-volume">
        <span className="coin-item-volume-value">{formatTradingVolume(tradingVolume)}</span>
      </div>
    </div>
  );
}

