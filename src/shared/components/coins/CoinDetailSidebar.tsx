'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useAppSelector } from '@/store/hooks';
import { selectPriceByMarket } from '@/store/slices/coinPriceSlice';
import { CoinPriceDayResponse } from '@/features/coins/services/coinPriceService';
import { useFearGreedByDate, useFearGreedToday } from '@/features/feargreed/hooks/useFearGreed';
import { FearGreedResponse } from '@/features/feargreed/services/fearGreedService';
import { useLongShort } from '@/features/longshort/hooks/useLongShort';
import { LongShortPeriod } from '@/features/longshort/services/longShortService';
import { useArticlesByDateRange } from '@/features/articles/hooks/useArticles';
import CoinDetailCandleChart from '@/shared/components/charts/CoinDetailCandleChart';
import CoinDetailLineChart from '@/shared/components/charts/CoinDetailLineChart';
import { HelpIcon } from '@/shared/components/ui';
import './CoinDetailSidebar.css';

interface CoinDetailSidebarProps {
  coin: CoinResponse | null;
  isClosing?: boolean;
  onClose: () => void;
}

interface TooltipPositionerProps {
  mouseX: number;
  mouseY: number;
  dateTimeString: string;
  longAccountPercent: string;
  shortAccountPercent: string;
  longShortRatio: string;
}

function TooltipPositioner({ mouseX, mouseY, dateTimeString, longAccountPercent, shortAccountPercent, longShortRatio }: TooltipPositionerProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipLeft, setTooltipLeft] = useState(0);
  
  useLayoutEffect(() => {
    if (!tooltipRef.current) return;
    
    const tooltipWidth = tooltipRef.current.offsetWidth || 180;
    const tooltipOffset = 0; // 마우스와 바로 붙이기
    
    // bar-group의 위치를 기준으로 마우스 위치를 조정
    const barGroup = tooltipRef.current.closest('.coin-detail-long-short-chart-bar-group');
    const chartBars = tooltipRef.current.closest('.coin-detail-long-short-chart-bars');
    
    if (!barGroup || !chartBars) return;
    
    const barGroupRect = barGroup.getBoundingClientRect();
    const chartBarsRect = chartBars.getBoundingClientRect();
    
    // 마우스 위치를 bar-group 기준으로 변환
    const relativeMouseX = mouseX - (barGroupRect.left - chartBarsRect.left);
    const chartBarsWidth = chartBars.clientWidth;
    
    // 마우스 우측에 배치했을 때 화면 밖으로 나가는지 확인
    const absoluteMouseX = mouseX;
    const wouldOverflow = absoluteMouseX + tooltipOffset + tooltipWidth > chartBarsWidth;
    
    // 우측에 배치할지 왼쪽에 배치할지 결정
    const left = wouldOverflow 
      ? relativeMouseX - tooltipWidth - tooltipOffset // 왼쪽에 배치
      : relativeMouseX + tooltipOffset; // 우측에 배치
    
    setTooltipLeft(left);
  }, [mouseX]);
  
  return (
    <div 
      ref={tooltipRef}
      className="coin-detail-long-short-chart-tooltip"
      style={{
        left: `${tooltipLeft}px`,
        top: `${mouseY}px`,
        transform: 'translateY(-50%)', // y축 중앙 정렬
      }}
    >
      <div className="coin-detail-long-short-chart-tooltip-content">
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">날짜/시간:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{dateTimeString}</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">롱 계정:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{longAccountPercent}%</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">숏 계정:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{shortAccountPercent}%</span>
        </div>
        <div className="coin-detail-long-short-chart-tooltip-item">
          <span className="coin-detail-long-short-chart-tooltip-label">롱/숏 비율:</span>
          <span className="coin-detail-long-short-chart-tooltip-value">{longShortRatio}</span>
        </div>
      </div>
    </div>
  );
}

export default function CoinDetailSidebar({ coin, isClosing = false, onClose }: CoinDetailSidebarProps) {
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [detailTab, setDetailTab] = useState<'detail' | 'memo'>('detail');
  const [selectedDateData, setSelectedDateData] = useState<CoinPriceDayResponse | null>(null);
  const [longShortPeriod, setLongShortPeriod] = useState<LongShortPeriod>('1h');
  const [isPriceChanged, setIsPriceChanged] = useState(false);
  const prevPriceRef = useRef<number | null>(null);
  const [gradientColors, setGradientColors] = useState({ start: '#1375ec', end: '#dd3c44' });
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [newsPage, setNewsPage] = useState(0);
  
  const dateString = useMemo(() => {
    if (!selectedDateData) return null;
    const date = new Date(selectedDateData.candleDateTimeKst);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDateData]);

  // 2018년 2월 1일 이전 날짜인지 확인
  const isDateBeforeMinDate = useMemo(() => {
    if (!selectedDateData) return false;
    try {
      const selectedDate = new Date(selectedDateData.candleDateTimeKst);
      const minDate = new Date('2018-02-01');
      return selectedDate < minDate;
    } catch {
      return false;
    }
  }, [selectedDateData]);
  
  const { data: fearGreedData, isLoading: isLoadingFearGreed } = useFearGreedByDate(dateString);
  const { data: fearGreedTodayData } = useFearGreedToday();
  const lastDisplayedDataRef = useRef<FearGreedResponse | null>(null);
  
  useEffect(() => {
    if (fearGreedData) {
      lastDisplayedDataRef.current = fearGreedData;
    }
  }, [fearGreedData]);
  
  const displayFearGreedData = fearGreedData || lastDisplayedDataRef.current;
  
  // CSS 변수 값 가져오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rootStyle = getComputedStyle(document.documentElement);
      const priceDownColor = rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
      const priceUpColor = rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44';
      setGradientColors({ start: priceDownColor, end: priceUpColor });
    }
  }, []);
  
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

  // 차트 클릭 핸들러: 날짜 선택
  const handleDateClick = (dateData: CoinPriceDayResponse | null) => {
    setSelectedDateData(dateData);
  };

  // 선택한 코인이 달라지거나 탭이 꺼질 때 초기화
  useEffect(() => {
    // 코인이 변경되거나 사이드바가 닫힐 때
    setSelectedDateData(null);
    setDetailTab('detail'); // 현재 데이터 탭이 default
  }, [coin?.id, isClosing]);

  // 롱/숏 비율 데이터 조회 (early return 전에 호출해야 함)
  const coinSymbol = coin?.symbol || null;
  const { data: longShortData = [], isLoading: isLoadingLongShort } = useLongShort(coinSymbol, longShortPeriod);
  
  // 뉴스 데이터 조회
  const { data: articlesData, isLoading: isLoadingArticles } = useArticlesByDateRange(dateString, newsPage);
  
  // 뉴스 탭이 활성화되거나 날짜가 변경되면 페이지를 0으로 리셋
  useEffect(() => {
    if (detailTab === 'memo') {
      setNewsPage(0);
    }
  }, [detailTab, dateString]);
  
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

  // 오늘 날짜 포맷팅 (YYYY년 MM월 DD일 (오늘))
  const formatTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 (오늘)`;
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

  // 공포/탐욕 지수 범위에 따른 색상 계산 (0-100 값을 파란색에서 빨간색으로 그라데이션)
  const getRangeColor = (value: number) => {
    if (typeof window === 'undefined') return '#171717';
    
    // CSS 변수 값 가져오기
    const rootStyle = getComputedStyle(document.documentElement);
    const priceDownColor = rootStyle.getPropertyValue('--price-down').trim() || '#1375ec';
    const priceUpColor = rootStyle.getPropertyValue('--price-up').trim() || '#dd3c44';
    
    // RGB 값 추출
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const startRgb = hexToRgb(priceDownColor);
    const endRgb = hexToRgb(priceUpColor);
    
    if (!startRgb || !endRgb) return '#171717';
    
    // 0-100 값을 0-1로 정규화
    const ratio = value / 100;
    
    // 그라데이션 계산
    const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
    const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
    const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
    
    return `rgb(${r}, ${g}, ${b})`;
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
          <div className="coin-detail-price-wrapper">
            {coin.exchange && (
              <span 
                className="coin-detail-exchange-marker"
                data-tooltip={`해당 가상화폐의 가격은 ${coin.exchange}를 따릅니다.`}
              >
                {coin.exchange}
              </span>
            )}
            <div 
              className={`coin-detail-price-info ${isPriceChanged ? 'price-changed' : ''}`}
              style={isPriceChanged ? { backgroundColor: getBackgroundColor() } : {}}
            >
              <div className="coin-detail-price-info-content">
                <div className="coin-detail-price-value" style={{ color: changeRateColor }}>
                  {price !== null ? `${formatPrice(price)}원` : '-'}
                </div>
                <div className="coin-detail-change-rate" style={{ color: changeRateColor }}>
                  {formatChangeRate(changeRate)}
                </div>
              </div>
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
              onDateClick={handleDateClick}
            />
          ) : (
            <CoinDetailCandleChart
              key={coin.id}
              coinId={coin.id}
              marketCode={coin.marketCode}
              containerClassName="coin-detail-chart"
              onDateClick={handleDateClick}
            />
          )}

          <div className="coin-detail-info-section">
            <div className="coin-detail-info-controls">
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'detail' ? 'active' : ''}`}
                onClick={() => setDetailTab('detail')}
              >
                상세 내용
              </button>
              <button
                className={`coin-detail-info-tab-button ${detailTab === 'memo' ? 'active' : ''}`}
                onClick={() => setDetailTab('memo')}
              >
                뉴스
              </button>
            </div>

            <div className="coin-detail-info-wrapper">
              {detailTab === 'detail' ? (
                // 상세 내용 탭: 날짜 선택 여부에 따라 현재 데이터 또는 선택된 날짜 데이터 표시
                <>
                  {selectedDateData ? (
                    // 선택된 날짜 데이터 표시
                    <>
                    <div className="coin-detail-info-details">
                    <div className="coin-detail-info-headline">
                          {formatDate(selectedDateData.candleDateTimeKst)}
                          <HelpIcon tooltip={`선택된 시점의 상세 가격 정보를 표시합니다. 
                                                upbit 거래소의 가격 정보를 기반으로 합니다.

                                                차트에서 빈공간을 클릭하면 현재 데이터로 전환되어 
                                                현재 일자의 실시간 상세 정보를 볼 수 있습니다.`} />
                    </div>
                    <div className="coin-detail-info-details-content">
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
                            </div>
                          </div>
                        </>
                      ) : (
                    // 현재 데이터 표시 (웹소켓 실시간 데이터)
                    <>
                      {!hasData || !priceData ? (
                        <div className="coin-detail-info-placeholder">
                          데이터가 없습니다.
                    </div>
                      ) : (
                        <div className="coin-detail-info-details">
                          <div className="coin-detail-info-headline">
                            {formatTodayDate()}
                            <HelpIcon tooltip={`현재 시점의 상세 가격 정보를 표시합니다. 
                                              upbit 거래소의 실시간 가격을 기반으로, 10초마다 렌더링합니다. 

                                              차트에서 날짜를 클릭하면 과거 데이터로 전환되어 
                                              해당 일자의 상세 정보를 볼 수 있습니다.`} />
                          </div>
                          <div className="coin-detail-info-details-content">
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
                                <span className="coin-detail-info-detail-value">
                                  {priceData.accTradeVolume24h !== null && priceData.accTradeVolume24h !== undefined
                                    ? `${formatPrice(priceData.accTradeVolume24h)} ${marketCode.split('-')[1]}`
                                    : '-'}
                                </span>
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
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const rangeRate = calculateRangeRate(
                                      priceData.highPrice ?? null,
                                      priceData.lowPrice ?? null,
                                      priceData.prevClosingPrice ?? null
                                    );
                                    return rangeRate !== null ? `${rangeRate.toFixed(2)}%` : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">일일 변동액</span>
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const dailyRange = calculateDailyRange(
                                      priceData.highPrice ?? null,
                                      priceData.lowPrice ?? null
                                    );
                                    return dailyRange !== null ? `${formatPrice(dailyRange)}원` : '-';
                                  })()}
                                </span>
                              </div>
                              <div className="coin-detail-info-detail-row">
                                <span className="coin-detail-info-detail-label">일일 평균 거래 단가</span>
                                <span className="coin-detail-info-detail-value">
                                  {(() => {
                                    const avgPrice = calculateAvgTradePrice(
                                      priceData.accTradePrice24h ?? null,
                                      priceData.accTradeVolume24h ?? null
                                    );
                                    return avgPrice !== null ? `${formatPrice(avgPrice)}원` : '-';
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                // 뉴스 탭
                <div className="coin-detail-news-section">
                  <div className="coin-detail-news-header">
                    {selectedDateData ? (
                      <div className="coin-detail-info-headline">
                        과거 기사 ({dateString})
                        <HelpIcon tooltip={`선택된 날짜의 암호화폐/금융 관련 뉴스를 표시합니다. 
                                              차트에서 빈공간을 클릭하면 현재 데이터로 전환되어 
                                              최신 뉴스를 볼 수 있습니다.`} />
                      </div>
                    ) : (
                      <div className="coin-detail-info-headline">
                        최신 기사 ({(() => {
                          const today = new Date();
                          const year = today.getFullYear();
                          const month = String(today.getMonth() + 1).padStart(2, '0');
                          const day = String(today.getDate()).padStart(2, '0');
                          return `${year}-${month}-${day}`;
                        })()})
                        <HelpIcon tooltip={`최신 암호화폐/금융 관련 뉴스를 표시합니다. 
                                              차트에서 날짜를 클릭하면 해당 날짜의 뉴스를 볼 수 있습니다.`} />
                      </div>
                    )}
                  </div>
                  
                  {isLoadingArticles ? (
                    <div className="coin-detail-info-placeholder">
                      로딩중 입니다.
                    </div>
                  ) : !articlesData || !articlesData.content || articlesData.content.length === 0 ? (
                    <div className="coin-detail-info-placeholder">
                      해당 날짜에 데이터가 없습니다.
                    </div>
                  ) : (
                    <>
                      <div className="coin-detail-news-list">
                        {articlesData.content.map((article) => {
                          const publishedDate = new Date(article.publishedAt);
                          const year = publishedDate.getFullYear();
                          const month = String(publishedDate.getMonth() + 1).padStart(2, '0');
                          const day = String(publishedDate.getDate()).padStart(2, '0');
                          const hours = String(publishedDate.getHours()).padStart(2, '0');
                          const minutes = String(publishedDate.getMinutes()).padStart(2, '0');
                          const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
                          
                          return (
                            <div key={article.id} className="coin-detail-news-item">
                              <a
                                href={article.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="coin-detail-news-link"
                              >
                                <div className="coin-detail-news-title">{article.headline}</div>
                                {article.summary && (
                                  <div className="coin-detail-news-summary">{article.summary}</div>
                                )}
                                <div className="coin-detail-news-meta">
                                  {article.reporterName ? (
                                    <span className="coin-detail-news-reporter">
                                      {article.reporterName} <span className="coin-detail-news-publisher">({article.publisherName})</span>
                                    </span>
                                  ) : (
                                    <span className="coin-detail-news-publisher">{article.publisherName}</span>
                                  )}
                                  <span className="coin-detail-news-date">{formattedDate}</span>
                                </div>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                      
                      {articlesData.totalPages > 1 && (
                        <div className="coin-detail-news-pagination">
                          <button
                            className="coin-detail-news-pagination-button"
                            onClick={() => setNewsPage(Math.max(0, newsPage - 1))}
                            disabled={articlesData.first || isLoadingArticles}
                          >
                            이전
                          </button>
                          <div className="coin-detail-news-pagination-info">
                            {newsPage + 1} / {articlesData.totalPages}
                          </div>
                          <button
                            className="coin-detail-news-pagination-button"
                            onClick={() => setNewsPage(Math.min(articlesData.totalPages - 1, newsPage + 1))}
                            disabled={articlesData.last || isLoadingArticles}
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 공포/탐욕 지수: 상세 내용 탭 */}
          {detailTab === 'detail' && (
            <div className="coin-detail-fear-greed-gauge">
              <div className="coin-detail-fear-greed-gauge-container">
                <div className="coin-detail-fear-greed-gauge-label">
                  공포/탐욕 지수
                  <HelpIcon tooltip={`공포/탐욕 지수는 암호화폐 시장의 '투자자 심리'를 
                                      0 부터 100 까지의 수치로 나타내는 지표입니다. 
                                      이 지표는 시장의 과열 또는 침체 상태를 판단하는 데 도움이 됩니다.

                                      차트에서 날짜를 선택하면 해당 날짜의 지수를 확인할 수 있으며, 
                                      이는 해당 날짜의 전체 시장 참여자의 심리를 반영하는 지표입니다.`} />
                </div>
                <div className="coin-detail-fear-greed-gauge-content">
                  {selectedDateData ? (
                    // 선택된 날짜의 Fear & Greed 데이터 표시
                    isDateBeforeMinDate ? (
                      // 2018년 2월 1일 이전 날짜: 블라인드 처리 및 메시지 표시
                      <>
                        <div className="coin-detail-fear-greed-gauge-placeholder">
                          해당 날짜의 공포/탐욕 지수가 존재하지 않습니다.
                        </div>
                        <div className="coin-detail-fear-greed-gauge-wrapper blurred">
                          <div className="coin-detail-fear-greed-gauge-semicircle">
                            <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                              <defs>
                                <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={gradientColors.start} />
                                  <stop offset="100%" stopColor={gradientColors.end} />
                                </linearGradient>
                              </defs>
                              <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="url(#fearGreedGradientSelected)"
                                strokeWidth="12"
                                strokeLinecap="round"
                              />
                              <g
                                transform="rotate(-90 100 100)"
                                style={{ color: 'var(--foreground)' }}
                              >
                                <line
                                  x1="100"
                                  y1="100"
                                  x2="100"
                                  y2="20"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="100"
                                  cy="100"
                                  r="6"
                                  fill="currentColor"
                                />
                              </g>
                            </svg>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-scale">
                            <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                            <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-value">-</div>
                          <div className="coin-detail-fear-greed-gauge-range">-</div>
                        </div>
                      </>
                    ) : !isLoadingFearGreed && !fearGreedData ? (
                      // 데이터가 없을 때 블라인드 처리 및 메시지 표시
                      <>
                        <div className="coin-detail-fear-greed-gauge-placeholder">
                          해당 날짜의 공포/탐욕 지수가 존재하지 않습니다.
                        </div>
                        <div className="coin-detail-fear-greed-gauge-wrapper blurred">
                          <div className="coin-detail-fear-greed-gauge-semicircle">
                            <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                              <defs>
                                <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={gradientColors.start} />
                                  <stop offset="100%" stopColor={gradientColors.end} />
                                </linearGradient>
                              </defs>
                              <path
                                d="M 20 100 A 80 80 0 0 1 180 100"
                                fill="none"
                                stroke="url(#fearGreedGradientSelected)"
                                strokeWidth="12"
                                strokeLinecap="round"
                              />
                              <g
                                transform="rotate(-90 100 100)"
                                style={{ color: 'var(--foreground)' }}
                              >
                                <line
                                  x1="100"
                                  y1="100"
                                  x2="100"
                                  y2="20"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                                <circle
                                  cx="100"
                                  cy="100"
                                  r="6"
                                  fill="currentColor"
                                />
                              </g>
                            </svg>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-scale">
                            <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                            <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                          </div>
                          <div className="coin-detail-fear-greed-gauge-value">-</div>
                          <div className="coin-detail-fear-greed-gauge-range">-</div>
                        </div>
                      </>
                    ) : displayFearGreedData ? (
                      <div className="coin-detail-fear-greed-gauge-wrapper">
                        <div className="coin-detail-fear-greed-gauge-semicircle">
                          <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                            <defs>
                              <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradientColors.start} />
                                <stop offset="100%" stopColor={gradientColors.end} />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="url(#fearGreedGradientSelected)"
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                            <g
                              transform={`rotate(${(displayFearGreedData.value / 100) * 180 - 90} 100 100)`}
                              style={{ color: 'var(--foreground)' }}
                            >
                              <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="6"
                                fill="currentColor"
                              />
                            </g>
                          </svg>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-scale">
                          <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                          <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-value">{displayFearGreedData.value}</div>
                        <div 
                          className="coin-detail-fear-greed-gauge-range"
                          style={{
                            color: getRangeColor(displayFearGreedData.value)
                          }}
                        >
                          {displayFearGreedData.value <= 24 && '극단적 공포'}
                          {displayFearGreedData.value >= 25 && displayFearGreedData.value <= 44 && '공포'}
                          {displayFearGreedData.value >= 45 && displayFearGreedData.value <= 54 && '중립'}
                          {displayFearGreedData.value >= 55 && displayFearGreedData.value <= 74 && '탐욕'}
                          {displayFearGreedData.value >= 75 && '극단적 탐욕'}
                        </div>
                      </div>
                    ) : (
                      <div className="coin-detail-fear-greed-gauge-wrapper">
                        <div className="coin-detail-fear-greed-gauge-semicircle">
                          <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                            <defs>
                              <linearGradient id="fearGreedGradientSelected" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={gradientColors.start} />
                                <stop offset="100%" stopColor={gradientColors.end} />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 20 100 A 80 80 0 0 1 180 100"
                              fill="none"
                              stroke="url(#fearGreedGradientSelected)"
                              strokeWidth="12"
                              strokeLinecap="round"
                            />
                            <g
                              transform="rotate(-90 100 100)"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="6"
                                fill="currentColor"
                              />
                            </g>
                          </svg>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-scale">
                          <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                          <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                        </div>
                        <div className="coin-detail-fear-greed-gauge-value">-</div>
                        <div className="coin-detail-fear-greed-gauge-range">-</div>
                      </div>
                    )
                  ) : fearGreedTodayData ? (
                    // 현재 데이터의 Fear & Greed 표시
                  <div className="coin-detail-fear-greed-gauge-wrapper">
                    <div className="coin-detail-fear-greed-gauge-semicircle">
                      <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                        {/* 반원형 배경 그라데이션 */}
                        <defs>
                            <linearGradient id="fearGreedGradientToday" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={gradientColors.start} />
                            <stop offset="100%" stopColor={gradientColors.end} />
                          </linearGradient>
                        </defs>
                        {/* 반원형 게이지 배경 */}
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                            stroke="url(#fearGreedGradientToday)"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        {/* 바늘 */}
                        <g
                            transform={`rotate(${(fearGreedTodayData.value / 100) * 180 - 90} 100 100)`}
                          style={{ color: 'var(--foreground)' }}
                        >
                          <line
                            x1="100"
                            y1="100"
                            x2="100"
                            y2="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <circle
                            cx="100"
                            cy="100"
                            r="6"
                            fill="currentColor"
                          />
                        </g>
                      </svg>
                    </div>
                    <div className="coin-detail-fear-greed-gauge-scale">
                      <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                      <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                    </div>
                      <div className="coin-detail-fear-greed-gauge-value">{fearGreedTodayData.value}</div>
                    <div 
                      className="coin-detail-fear-greed-gauge-range"
                      style={{
                          color: getRangeColor(fearGreedTodayData.value)
                      }}
                    >
                        {fearGreedTodayData.value <= 24 && '극단적 공포'}
                        {fearGreedTodayData.value >= 25 && fearGreedTodayData.value <= 44 && '공포'}
                        {fearGreedTodayData.value >= 45 && fearGreedTodayData.value <= 54 && '중립'}
                        {fearGreedTodayData.value >= 55 && fearGreedTodayData.value <= 74 && '탐욕'}
                        {fearGreedTodayData.value >= 75 && '극단적 탐욕'}
                      </div>
                    </div>
                  ) : (
                    <div className="coin-detail-fear-greed-gauge-wrapper">
                      <div className="coin-detail-fear-greed-gauge-semicircle">
                        <svg className="coin-detail-fear-greed-gauge-svg" viewBox="0 0 200 120">
                          <defs>
                            <linearGradient id="fearGreedGradientToday" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={gradientColors.start} />
                              <stop offset="100%" stopColor={gradientColors.end} />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#fearGreedGradientToday)"
                            strokeWidth="12"
                            strokeLinecap="round"
                          />
                          <g
                            transform="rotate(-90 100 100)"
                            style={{ color: 'var(--foreground)' }}
                          >
                            <line
                              x1="100"
                              y1="100"
                              x2="100"
                              y2="20"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r="6"
                              fill="currentColor"
                            />
                          </g>
                        </svg>
                      </div>
                      <div className="coin-detail-fear-greed-gauge-scale">
                        <span className="coin-detail-fear-greed-gauge-scale-start">0</span>
                        <span className="coin-detail-fear-greed-gauge-scale-end">100</span>
                      </div>
                      <div className="coin-detail-fear-greed-gauge-value">-</div>
                      <div className="coin-detail-fear-greed-gauge-range">-</div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* 롱/숏 비율: 상세 내용 탭 */}
          {detailTab === 'detail' && (
            <div className="coin-detail-long-short">
              <div className="coin-detail-long-short-container">
                <div className="coin-detail-long-short-header">
                  <div className="coin-detail-long-short-label">
                    롱/숏 비율
                    <HelpIcon tooltip={`암호화폐 시장은 선물 거래의 영향을 크게 받고, 
                                        선물 거래는 롱숏 포지션을 통해 이루어집니다.

                                        롱 포지션 비율이 높으면 상승 기대감이 크고, 
                                        숏 포지션 비율이 높으면 하락 우려가 큰 것으로 해석할 수 있습니다.

                                        최신 30개의 데이터를 제공하며, 
                                        binance 거래소의 고래 선물 지표를 따릅니다.`} />
                  </div>
                  <div className="coin-detail-info-controls">
                    {(['1h', '4h', '12h', '1d'] as LongShortPeriod[]).map((period) => (
                      <button
                        key={period}
                        className={`coin-detail-info-tab-button ${longShortPeriod === period ? 'active' : ''}`}
                        onClick={() => setLongShortPeriod(period)}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="coin-detail-long-short-content">
                  {isLoadingLongShort ? (
                    <div className="coin-detail-long-short-loading">로딩중 입니다.</div>
                  ) : longShortData.length > 0 ? (
                    <>
                      {/* 가장 최신 데이터: 가로 막대 그래프 */}
                      {(() => {
                        const latestData = longShortData[longShortData.length - 1];
                        return latestData && (
                          <div className="coin-detail-long-short-latest">
                            <div className="coin-detail-long-short-latest-label">
                              {(() => {
                                const date = new Date(latestData.timestamp);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                const ampm = hours >= 12 ? '오후' : '오전';
                                const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                                return `${year}-${month}-${day} ${ampm} ${String(displayHours).padStart(2, '0')}:${minutes}`;
                              })()} (기준)
                            </div>
                            <div className="coin-detail-long-short-latest-bar">
                              {/* 막대 위쪽: % 값 */}
                              <div className="coin-detail-long-short-bar-labels-top">
                                <span 
                                  className="coin-detail-long-short-bar-label-top"
                                  style={{ color: 'var(--price-up)' }}
                                >
                                  {(parseFloat(latestData.longAccount) * 100).toFixed(1)}%
                                </span>
                                <span 
                                  className="coin-detail-long-short-bar-label-top"
                                  style={{ color: 'var(--price-down)' }}
                                >
                                  {(parseFloat(latestData.shortAccount) * 100).toFixed(1)}%
                                </span>
                              </div>
                              {/* 막대 그래프 */}
                              <div className="coin-detail-long-short-bar-container">
                                <div 
                                  className="coin-detail-long-short-bar-long"
                                  style={{
                                    width: `${(parseFloat(latestData.longAccount) * 100).toFixed(1)}%`
                                  }}
                                />
                                <div 
                                  className="coin-detail-long-short-bar-short"
                                  style={{
                                    width: `${(parseFloat(latestData.shortAccount) * 100).toFixed(1)}%`
                                  }}
                                />
                              </div>
                              {/* 막대 하단: 롱/숏 포지션 텍스트 */}
                              <div className="coin-detail-long-short-bar-labels-bottom">
                                <span className="coin-detail-long-short-bar-label-bottom">
                                  롱 포지션
                                </span>
                                <span className="coin-detail-long-short-bar-label-bottom">
                                  숏 포지션
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* 최근 30개 데이터: 세로 막대 그래프 */}
                      <div className="coin-detail-long-short-chart">
                        <div className="coin-detail-long-short-chart-bars">
                          {longShortData.slice(-30).map((item, index) => {
                            const longPercent = parseFloat(item.longAccount) * 100;
                            const shortPercent = parseFloat(item.shortAccount) * 100;
                            const maxHeight = 100;
                            const date = new Date(item.timestamp);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}`;
                            const longAccountPercent = (parseFloat(item.longAccount) * 100).toFixed(2);
                            const shortAccountPercent = (parseFloat(item.shortAccount) * 100).toFixed(2);
                            const longShortRatio = parseFloat(item.longShortRatio).toFixed(2);
                            const isHovered = hoveredBarIndex === index;
                            
                            return (
                              <div 
                                key={index} 
                                className="coin-detail-long-short-chart-bar-group"
                                onMouseEnter={() => setHoveredBarIndex(index)}
                                onMouseLeave={() => {
                                  setHoveredBarIndex(null);
                                  setMousePosition(null);
                                }}
                                onMouseMove={(e) => {
                                  const chartBars = e.currentTarget.closest('.coin-detail-long-short-chart-bars');
                                  const chartBarsRect = chartBars?.getBoundingClientRect();
                                  if (chartBarsRect) {
                                    setMousePosition({
                                      x: e.clientX - chartBarsRect.left,
                                      y: e.clientY - chartBarsRect.top
                                    });
                                  }
                                }}
                              >
                                <div className="coin-detail-long-short-chart-bar-wrapper">
                                  <div 
                                    className="coin-detail-long-short-chart-bar-long"
                                    style={{
                                      height: `${(longPercent / 100) * maxHeight}%`
                                    }}
                                  />
                                  <div 
                                    className="coin-detail-long-short-chart-bar-short"
                                    style={{
                                      height: `${(shortPercent / 100) * maxHeight}%`
                                    }}
                                  />
                                </div>
                                {isHovered && mousePosition && (
                                  <TooltipPositioner
                                    mouseX={mousePosition.x}
                                    mouseY={mousePosition.y}
                                    dateTimeString={dateTimeString}
                                    longAccountPercent={longAccountPercent}
                                    shortAccountPercent={shortAccountPercent}
                                    longShortRatio={longShortRatio}
                                  />
                                )}
                                <div className="coin-detail-long-short-chart-time">
                                  {hours}:{minutes}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="coin-detail-long-short-empty">
                      롱/숏 비율 데이터가 없습니다.
                    </div>
                  )}
                </div>
              </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}

