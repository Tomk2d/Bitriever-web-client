'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import './CoinItem.css';

interface CoinItemProps {
  coin: CoinResponse;
  rank: number;
  isSelected?: boolean;
  onClick?: () => void;
  selectedCurrency?: string;
}

function CoinItem({ coin, rank, isSelected = false, onClick, selectedCurrency = 'KRW' }: CoinItemProps) {
  // 이미지 URL 구성
  const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
  const imageUrl = coin.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPriceDataRef = useRef<number | null>(null);
  
  // Redux에서 해당 코인의 전체 가격 정보 구독 (동적으로 marketCode 전달)
  const priceData = useAppSelector(selectPriceByMarket(coin.marketCode));
  
  // 데이터가 없으면 '-' 표시
  const hasData = priceData !== null;
  
  // 현재가
  const price = hasData ? (priceData.tradePrice || 0) : null;
  
  // 등락율: signedChangeRate 사용 (부호 포함, 음수 가능, 퍼센트 값, 예: 0.05 = 5%, -0.05 = -5%)
  // changeRate는 절댓값이므로 signedChangeRate를 사용해야 음수 반영 가능
  // signedChangeRate가 없으면 changeRate를 사용 (fallback)
  const changeRate = hasData 
    ? (priceData.signedChangeRate !== undefined && priceData.signedChangeRate !== null
        ? priceData.signedChangeRate
        : (priceData.changeRate !== undefined && priceData.changeRate !== null ? priceData.changeRate : 0))
    : null;
  
  // 거래대금: accTradePrice24h 사용
  const accTradePrice24h = hasData ? (priceData.accTradePrice24h || 0) : null;

  // 가격 데이터 변경 감지 및 애니메이션 트리거
  useEffect(() => {
    if (price !== null && prevPriceDataRef.current !== null && price !== prevPriceDataRef.current) {
      // 가격이 변경되었을 때 애니메이션 트리거
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // 애니메이션 지속 시간과 동일하게 설정
      
      return () => clearTimeout(timer);
    }
    // 이전 가격 업데이트
    prevPriceDataRef.current = price;
  }, [price]);

  const formatPrice = (value: number | null) => {
    if (value === null) return '-';
    if (value === 0) return '0';
    // 100보다 작으면 소수점 8자리까지 표기
    if (value < 100) {
      return value.toFixed(8).replace(/\.?0+$/, ''); // 끝의 불필요한 0 제거
    }
    // 100 이상이면 기존처럼 천단위 구분자 사용
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  // 등락율: changeRate를 퍼센트 형식으로 표시 (0 이상이면 빨간색, 작으면 파란색)
  const formatChangeRate = (changeRate: number | null) => {
    if (changeRate === null) return '-';
    if (changeRate === 0) return '0.00%';
    const sign = changeRate > 0 ? '+' : '';
    // changeRate는 소수점 값 (예: 0.05 = 5%), 퍼센트로 변환
    return `${sign}${(changeRate * 100).toFixed(2)}%`;
  };

  // 거래대금: accTradePrice24h를 백만 단위로 표기 (BTC/USDT는 원본 숫자 그대로)
  const formatTradingVolume = (volume: number | null) => {
    if (volume === null) return '-';
    if (volume === 0) {
      // BTC/USDT 마켓인 경우 단위를 BTC/USDT로 표시 (공백 포함)
      if (selectedCurrency === 'BTC' || selectedCurrency === 'USDT') {
        return `0 ${selectedCurrency}`;
      }
      return '0백만';
    }
    
    // BTC/USDT 마켓인 경우 원본 숫자 그대로 표시 (조건부 소수점)
    if (selectedCurrency === 'BTC' || selectedCurrency === 'USDT') {
      let formattedValue: string;
      
      if (volume < 10) {
        // 10보다 작을 때: 소수점 4자리까지
        formattedValue = volume.toFixed(4).replace(/\.?0+$/, ''); // 끝의 불필요한 0 제거
      } else if (volume < 100) {
        // 100보다 작을 때 (10 이상): 소수점 2자리까지
        formattedValue = volume.toFixed(2).replace(/\.?0+$/, ''); // 끝의 불필요한 0 제거
      } else {
        // 100 이상: 소수점 표기 안함
        formattedValue = new Intl.NumberFormat('ko-KR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(volume);
      }
      
      return `${formattedValue} ${selectedCurrency}`;
    }
    
    // KRW 마켓인 경우 백만 단위로 변환
    const million = volume / 1000000;
    return `${new Intl.NumberFormat('ko-KR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(million)}백만`;
  };

  // 등락율 색상: changeRate가 0 이상이면 빨간색, 작으면 파란색
  const changeRateColor = changeRate === null 
    ? 'var(--foreground)' 
    : changeRate >= 0 
      ? 'var(--price-up)' 
      : 'var(--price-down)';

  return (
    <div 
      className={`coin-item ${isSelected ? 'selected' : ''} ${isAnimating ? 'price-updated' : ''}`} 
      onClick={onClick} 
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="coin-item-section coin-item-info">
        <div className="coin-item-rank">{rank}</div>
        {imageUrl ? (
          <img
            src={imageUrl}
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
        <span className="coin-item-price-value" style={{ color: changeRateColor }}>
          {price !== null ? `${formatPrice(price)}${selectedCurrency === 'KRW' ? '원' : selectedCurrency}` : '-'}
        </span>
      </div>
      <div className="coin-item-section coin-item-change">
        <span className="coin-item-change-value" style={{ color: changeRateColor }}>
          {formatChangeRate(changeRate)}
        </span>
      </div>
      <div className="coin-item-section coin-item-volume">
        <span className="coin-item-volume-value">{formatTradingVolume(accTradePrice24h)}</span>
      </div>
    </div>
  );
}

// React.memo로 최적화: props가 변경되지 않으면 리렌더링 방지
// 각 CoinItem이 자신의 가격만 구독하므로, 다른 코인의 가격이 변경되어도 리렌더링되지 않음
export default memo(CoinItem, (prevProps, nextProps) => {
  // coin, rank, isSelected, onClick이 모두 동일하면 리렌더링 방지
  // 가격은 Redux selector로 자동 구독되므로 여기서 비교할 필요 없음
  return (
    prevProps.coin.id === nextProps.coin.id &&
    prevProps.rank === nextProps.rank &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onClick === nextProps.onClick
  );
});

