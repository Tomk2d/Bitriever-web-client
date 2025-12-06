'use client';

import { useState, useEffect, useRef } from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import CoinDetailCandleChart from '@/shared/components/charts/CoinDetailCandleChart';
import CoinDetailLineChart from '@/shared/components/charts/CoinDetailLineChart';
import './CoinDetailSidebar.css';

interface CoinDetailSidebarProps {
  coin: CoinResponse | null;
  isClosing?: boolean;
  onClose: () => void;
}

export default function CoinDetailSidebar({ coin, isClosing = false, onClose }: CoinDetailSidebarProps) {
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [detailTab, setDetailTab] = useState<'detail' | 'memo'>('detail');
  const [selectedDateData, setSelectedDateData] = useState<CoinPriceDayResponse | null>(null);
  const [isPriceChanged, setIsPriceChanged] = useState(false);
  const prevPriceRef = useRef<number | null>(null);
  
  // Hooks 규칙: early return 전에 모든 hooks 호출
  // coin이 null일 수 있으므로 안전하게 처리
  const priceData = useAppSelector(selectPriceByMarket(coin?.marketCode || ''));
  
  // 가격 변동 감지
  useEffect(() => {
    if (priceData?.tradePrice !== undefined && priceData.tradePrice !== null) {
      const currentPrice = priceData.tradePrice;
      
      if (prevPriceRef.current !== null && prevPriceRef.current !== currentPrice) {
        // 가격이 변경되었을 때 깜빡임 효과 트리거
        setIsPriceChanged(true);
        const timer = setTimeout(() => {
          setIsPriceChanged(false);
        }, 500); // 0.5초 후 애니메이션 제거
        
        return () => clearTimeout(timer);
      }
      
      prevPriceRef.current = currentPrice;
    }
  }, [priceData?.tradePrice]);
  
  if (!coin) return null;

  // 이미지 URL 구성
  const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
  const imageUrl = coin.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
  
  const koreanName = coin.koreanName || coin.marketCode;
  const marketCode = coin.marketCode;

  // 데이터가 없으면 '-' 표시
  const hasData = priceData !== null;
  
  // 현재가
  const price = hasData ? (priceData.tradePrice || 0) : null;
  
  // 등락율: signedChangeRate 사용 (부호 포함, 음수 가능, 퍼센트 값)
  const changeRate = hasData 
    ? (priceData.signedChangeRate !== undefined && priceData.signedChangeRate !== null
        ? priceData.signedChangeRate
        : (priceData.changeRate !== undefined && priceData.changeRate !== null ? priceData.changeRate : 0))
    : null;

  // 가격 포맷팅
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

  // 날짜 포맷팅 (YYYY년 MM월 DD일)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  // 등락율 포맷팅
  const formatChangeRate = (changeRate: number | null) => {
    if (changeRate === null) return '-';
    if (changeRate === 0) return '0.00%';
    const sign = changeRate > 0 ? '+' : '';
    // changeRate는 소수점 값 (예: 0.05 = 5%), 퍼센트로 변환
    return `${sign}${(changeRate * 100).toFixed(2)}%`;
  };

  // 일일 변동폭 계산
  const calculateDailyRange = (highPrice: number | null, lowPrice: number | null) => {
    if (highPrice === null || lowPrice === null) return null;
    return highPrice - lowPrice;
  };

  // 변동폭 비율 계산
  const calculateRangeRate = (highPrice: number | null, lowPrice: number | null, prevClosingPrice: number | null) => {
    if (highPrice === null || lowPrice === null || prevClosingPrice === null || prevClosingPrice === 0) return null;
    return ((highPrice - lowPrice) / prevClosingPrice) * 100;
  };

  // 평균 거래 단가 계산
  const calculateAvgTradePrice = (accTradePrice: number | null, accTradeVolume: number | null) => {
    if (accTradePrice === null || accTradeVolume === null || accTradeVolume === 0) return null;
    return accTradePrice / accTradeVolume;
  };

  // 등락율 색상: changeRate가 0 이상이면 상승 색상, 작으면 하락 색상
  const changeRateColor = changeRate === null 
    ? 'var(--foreground)' 
    : changeRate >= 0 
      ? 'var(--price-up)' 
      : 'var(--price-down)';

  // 배경색: 텍스트 색상에 맞춘 연한 색상
  const getBackgroundColor = () => {
    if (changeRate === null) return 'rgba(0, 0, 0, 0.05)';
    if (changeRate >= 0) return 'rgba(221, 60, 68, 0.1)'; // price-up 연한 버전
    return 'rgba(19, 117, 236, 0.1)'; // price-down 연한 버전
  };

  return (
    <div className="coin-detail-sidebar">
      <div className="coin-detail-sidebar-content">
        <div className="coin-detail-sidebar-header">
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt={koreanName}
              className="coin-detail-coin-image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className="coin-detail-coin-name-wrapper">
            <div className="coin-detail-coin-name">{koreanName}</div>
            <div className="coin-detail-market-code">{marketCode}</div>
          </div>
          <div 
            className={`coin-detail-price-info ${isPriceChanged ? 'price-changed' : ''}`}
            style={isPriceChanged ? { backgroundColor: getBackgroundColor() } : {}}
          >
            <div className="coin-detail-price-value" style={{ color: changeRateColor }}>
              {price !== null ? `${formatPrice(price)}원` : '-'}
            </div>
            <div className="coin-detail-change-rate" style={{ color: changeRateColor }}>
              {formatChangeRate(changeRate)}
            </div>
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

          <div className="coin-detail-chart-controls">
            <button
              className={`coin-detail-chart-type-button ${chartType === 'candle' ? 'active' : ''}`}
              onClick={() => setChartType('candle')}
            >
              캔들
            </button>
            <button
              className={`coin-detail-chart-type-button ${chartType === 'line' ? 'active' : ''}`}
              onClick={() => setChartType('line')}
            >
              라인
            </button>
          </div>

          {chartType === 'line' ? (
            <CoinDetailLineChart
              key={coin.id}
              coinId={coin.id}
              marketCode={coin.marketCode}
              containerClassName="coin-detail-chart"
              onDateClick={setSelectedDateData}
            />
          ) : (
            <CoinDetailCandleChart
              key={coin.id}
              coinId={coin.id}
              marketCode={coin.marketCode}
              containerClassName="coin-detail-chart"
              onDateClick={setSelectedDateData}
            />
          )}

          <div className="coin-detail-info-section">
            <div className="coin-detail-info-controls">
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'detail' ? 'active' : ''}`}
                onClick={() => setDetailTab('detail')}
              >
                상세내용
              </button>
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'memo' ? 'active' : ''}`}
                onClick={() => setDetailTab('memo')}
              >
                뉴스
              </button>
            </div>

            <div className="coin-detail-info-wrapper">
              {!selectedDateData && (
                <div className="coin-detail-info-placeholder">
                  차트에서 일자를 선택하세요.
                </div>
              )}
              <div className={`coin-detail-info-details ${!selectedDateData ? 'blurred' : ''}`}>
                <div className="coin-detail-info-headline">
                  {selectedDateData ? formatDate(selectedDateData.candleDateTimeKst) : '0000년 00월 00일'}
                </div>
                <div className="coin-detail-info-details-content">
                {selectedDateData ? (
                <>
                  <div className="coin-detail-info-details-left">
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">전날 대비 가격 변화율</span>
                      <span className={`coin-detail-info-detail-value ${(selectedDateData.changeRate || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatChangeRate(selectedDateData.changeRate)}
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">전날 대비 가격 변화액</span>
                      <span className={`coin-detail-info-detail-value ${(selectedDateData.changePrice || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(selectedDateData.changePrice || 0) >= 0 ? '+' : ''}{formatPrice(selectedDateData.changePrice)}원
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">누적 거래량</span>
                      <span className="coin-detail-info-detail-value">{formatPrice(selectedDateData.candleAccTradeVolume)} {marketCode.split('-')[1]}</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">누적 거래액</span>
                      <span className="coin-detail-info-detail-value">{formatPrice(selectedDateData.candleAccTradePrice)}원</span>
                    </div>
                  </div>
                  <div className="coin-detail-info-details-right">
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label"></span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 변동율</span>
                      <span className="coin-detail-info-detail-value">
                        {(() => {
                          const rangeRate = calculateRangeRate(selectedDateData.highPrice, selectedDateData.lowPrice, selectedDateData.prevClosingPrice);
                          return rangeRate !== null ? `${rangeRate.toFixed(2)}%` : '-';
                        })()}
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 변동액</span>
                      <span className="coin-detail-info-detail-value">
                        {formatPrice(calculateDailyRange(selectedDateData.highPrice, selectedDateData.lowPrice))}원
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 평균 거래 단가</span>
                      <span className="coin-detail-info-detail-value">
                        {(() => {
                          const avgPrice = calculateAvgTradePrice(selectedDateData.candleAccTradePrice, selectedDateData.candleAccTradeVolume);
                          return avgPrice !== null ? `${formatPrice(avgPrice)}원` : '-';
                        })()}
                      </span>
                    </div>
                  </div>
                </>
              ) : hasData && priceData ? (
                <>
                  <div className="coin-detail-info-details-left">
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">전날 대비 가격 변화율</span>
                      <span className={`coin-detail-info-detail-value ${(priceData.signedChangeRate !== undefined ? priceData.signedChangeRate : priceData.changeRate || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {formatChangeRate(priceData.signedChangeRate !== undefined ? priceData.signedChangeRate : priceData.changeRate)}
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">전날 대비 가격 변화액</span>
                      <span className={`coin-detail-info-detail-value ${(priceData.changePrice || 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(priceData.changePrice || 0) >= 0 ? '+' : ''}{formatPrice(priceData.changePrice)}원
                      </span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">누적 거래량</span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">누적 거래액</span>
                      <span className="coin-detail-info-detail-value">{formatPrice(priceData.accTradePrice24h)}원</span>
                    </div>
                  </div>
                  <div className="coin-detail-info-details-right">
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label"></span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 변동율</span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 변동액</span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                    <div className="coin-detail-info-detail-row">
                      <span className="coin-detail-info-detail-label">일일 평균 거래 단가</span>
                      <span className="coin-detail-info-detail-value">-</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="coin-detail-info-no-data">데이터가 없습니다.</div>
              )}
                </div>
              </div>
            </div>
          </div>

          <div className="coin-detail-content">
            <p>첫 번째 줄입니다. 차트 아래에 표시되는 내용입니다.</p>
            <p>두 번째 줄입니다. 스크롤이 가능한 영역입니다.</p>
            <p>세 번째 줄입니다. 내용이 많아지면 스크롤이 생깁니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

