'use client';

import { useState, useEffect } from 'react';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';
import { formatCurrency, formatQuantity } from '@/features/asset/utils/assetCalculations';
import { diaryService, type DiaryResponse } from '@/features/diary/services/diaryService';
import './IndividualTradingHistoryPanel.css';

interface IndividualTradingHistoryPanelProps {
  tradingHistory: TradingHistoryResponse | null;
  onClose: () => void;
}

export default function IndividualTradingHistoryPanel({
  tradingHistory,
  onClose,
}: IndividualTradingHistoryPanelProps) {
  if (!tradingHistory) {
    return null;
  }

  const coin = tradingHistory.coin;
  const isBuy = tradingHistory.tradeType === 0;
  const koreanName = coin?.koreanName || coin?.symbol || `코인 ${tradingHistory.coinId}`;
  const marketCode = coin?.marketCode || '-';
  
  // 이미지 URL 구성 (public 폴더는 루트 경로로 제공됨)
  const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
  const imageUrl = coin?.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
  
  // 시간 정보 포맷팅 (오전/오후 형식)
  const formatTradeTime = (timeString: string): string => {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    const isAM = hours < 12;
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = isAM ? '오전' : '오후';
    
    return `${ampm} ${displayHours}시 ${minutes}분 ${seconds}초`;
  };
  
  // 매도시 실제 득실 금액 계산
  const calculateProfitLoss = (): number | null => {
    if (isBuy || !tradingHistory.avgBuyPrice) {
      return null;
    }
    const sellAmount = tradingHistory.price * tradingHistory.quantity;
    const buyAmount = tradingHistory.avgBuyPrice * tradingHistory.quantity;
    return sellAmount - buyAmount;
  };
  
  const profitLoss = calculateProfitLoss();
  const profitLossRate = tradingHistory.profitLossRate ?? 0;

  // 매매일지 데이터
  const [diary, setDiary] = useState<DiaryResponse | null>(null);
  const [isLoadingDiary, setIsLoadingDiary] = useState(false);

  // tradingMind를 한국어로 변환
  const getTradingMindText = (mindCode: number | null | undefined): string => {
    if (mindCode === null || mindCode === undefined) return '';
    
    const mindMap: Record<number, string> = {
      0: '무념무상',
      1: '확신',
      2: '약간 확신',
      3: '기대감',
      11: '욕심',
      12: '조급함',
      13: '불안',
      14: '두려움',
    };
    
    return mindMap[mindCode] || '';
  };

  // tradingMind에 따른 색상 반환
  const getTradingMindColor = (mindCode: number | null | undefined): string => {
    if (mindCode === null || mindCode === undefined) return '';
    
    const colorMap: Record<number, string> = {
      0: '#6b7280', // 무념무상 - 회색
      1: '#10b981', // 확신 - 초록색
      2: '#84cc16', // 약간 확신 - 연두색
      3: '#3b82f6', // 기대감 - 파란색
      11: '#f59e0b', // 욕심 - 주황색
      12: '#ef4444', // 조급함 - 빨간색
      13: '#8b5cf6', // 불안 - 보라색
      14: '#6366f1', // 두려움 - 인디고
    };
    
    return colorMap[mindCode] || '';
  };

  // 매매일지 데이터 가져오기
  useEffect(() => {
    if (!tradingHistory?.id) {
      setDiary(null);
      return;
    }

    setIsLoadingDiary(true);
    diaryService.getByTradingHistoryId(tradingHistory.id)
      .then((data) => {
        setDiary(data);
      })
      .catch((error) => {
        console.error('[IndividualTradingHistoryPanel] 매매일지 조회 실패:', error);
        setDiary(null);
      })
      .finally(() => {
        setIsLoadingDiary(false);
      });
  }, [tradingHistory?.id]);

  const tradingMindText = diary?.tradingMind !== null && diary?.tradingMind !== undefined 
    ? getTradingMindText(diary.tradingMind)
    : null;

  const tradingMindColor = diary?.tradingMind !== null && diary?.tradingMind !== undefined
    ? getTradingMindColor(diary.tradingMind)
    : '';

  // 매매일지가 있고, 최소 하나의 필드라도 값이 있는 경우에만 섹션 표시
  const hasDiaryContent = diary && (
    (tradingMindText !== null && tradingMindText !== '') ||
    (diary.content !== null && diary.content !== undefined && diary.content.trim() !== '') ||
    (diary.tags !== null && diary.tags !== undefined && diary.tags.length > 0)
  );

  return (
    <div className="individual-trading-history-panel">
      <div className="individual-trading-history-panel-content">
        <div className="individual-trading-history-panel-header">
          <div className="individual-trading-history-panel-header-left">
            <h3 className="individual-trading-history-panel-title">매매일지</h3>
            <div className="individual-trading-history-trade-time">
              {formatTradeTime(tradingHistory.tradeTime)}
            </div>
          </div>
          <button
            className="individual-trading-history-panel-close"
            onClick={onClose}
            aria-label="패널 닫기"
          >
            ×
          </button>
        </div>
        <div className="individual-trading-history-panel-body">
          <div className="individual-trading-history-info">
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={koreanName}
                className="individual-trading-history-coin-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="individual-trading-history-coin-info">
              <div className="individual-trading-history-coin-name">{koreanName}</div>
              <div className="individual-trading-history-market-code">{marketCode}</div>
            </div>
            <div className={`individual-trading-history-trade-type ${isBuy ? 'buy' : 'sell'}`}>
              {isBuy ? '매수' : '매도'}
            </div>
          </div>
          
          <div className="individual-trading-history-chart"></div>
          
          <div className="individual-trading-history-details">
            <div className="individual-trading-history-details-left">
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">매수평균가</span>
                <span className="individual-trading-history-detail-value">
                  {isBuy 
                    ? formatCurrency(tradingHistory.price)
                    : (tradingHistory.avgBuyPrice !== null ? formatCurrency(tradingHistory.avgBuyPrice) : '-')
                  }
                </span>
              </div>
              
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">매도평균가</span>
                <span className="individual-trading-history-detail-value">
                  {!isBuy ? formatCurrency(tradingHistory.price) : '-'}
                </span>
              </div>
              
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">거래수량</span>
                <span className="individual-trading-history-detail-value">
                  {formatQuantity(tradingHistory.quantity)} {coin?.symbol || ''}
                </span>
              </div>
            </div>
            
            <div className="individual-trading-history-details-right">
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">총거래금액</span>
                <span className="individual-trading-history-detail-value">
                  {formatCurrency(tradingHistory.totalPrice)}
                </span>
              </div>
              
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">수익률</span>
                <span className={`individual-trading-history-detail-value ${profitLossRate >= 0 ? 'positive' : 'negative'}`}>
                  {!isBuy ? `${profitLossRate >= 0 ? '+' : ''}${profitLossRate.toFixed(2)}%` : '-'}
                </span>
              </div>
              
              <div className="individual-trading-history-detail-row">
                <span className="individual-trading-history-detail-label">총수익금</span>
                <span className={`individual-trading-history-detail-value ${profitLoss !== null && profitLoss >= 0 ? 'positive' : 'negative'}`}>
                  {profitLoss !== null ? `${profitLoss >= 0 ? '+' : ''}${formatCurrency(profitLoss)}` : '-'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="individual-trading-history-additional-info">
            <div className="individual-trading-history-additional-row">
              <div className="individual-trading-history-additional-item">
                <span className="individual-trading-history-detail-label">거래방식</span>
                <span className="individual-trading-history-detail-value">
                  {coin?.quoteCurrency || '-'}
                </span>
              </div>
              <div className="individual-trading-history-additional-item">
                <span className="individual-trading-history-detail-label">거래소</span>
                <span className="individual-trading-history-detail-value">
                  {coin?.exchange || '-'}
                </span>
              </div>
              <div className="individual-trading-history-additional-item">
                <span className="individual-trading-history-detail-label">수수료</span>
                <span className="individual-trading-history-detail-value">
                  {formatCurrency(tradingHistory.fee)}
                </span>
              </div>
            </div>
          </div>

          {hasDiaryContent && (
            <div className="individual-trading-history-diary">
              {tradingMindText !== null && tradingMindText !== '' && (
                <div className="individual-trading-history-diary-item">
                  <div className="individual-trading-history-diary-mind-wrapper">
                    <h3 className="individual-trading-history-diary-value individual-trading-history-diary-value-mind">
                      <span 
                        className="individual-trading-history-diary-mind-text"
                        style={{ color: tradingMindColor }}
                      >
                        {tradingMindText}
                      </span>의 마인드로 진행한 거래에요.
                    </h3>
                  </div>
                </div>
              )}
              {diary && diary.content !== null && diary.content !== undefined && diary.content.trim() !== '' && (
                <div className="individual-trading-history-diary-item">
                  <span className="individual-trading-history-diary-label">매매근거 & 고려사항</span>
                  <span className="individual-trading-history-diary-value">
                    {diary.content}
                  </span>
                </div>
              )}
              {diary && diary.tags !== null && diary.tags !== undefined && diary.tags.length > 0 && (
                <div className="individual-trading-history-diary-item">
                  <span className="individual-trading-history-diary-label">태그</span>
                  <span className="individual-trading-history-diary-value">
                    {diary.tags.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

