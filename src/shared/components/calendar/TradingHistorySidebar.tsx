'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';
import { formatCurrency, formatNumber, formatQuantity, truncateIfLong, truncateNumberWithUnit } from '@/features/asset/utils/assetCalculations';
import IndividualTradingHistoryPanel, { type IndividualTradingHistoryPanelRef } from './IndividualTradingHistoryPanel';
import './TradingHistorySidebar.css';

type SortOption = 'latest' | 'oldest' | 'amount' | 'name' | 'profitHigh' | 'profitLow';

interface TradingHistorySidebarProps {
  selectedDate: Date | null;
  tradingHistories: TradingHistoryResponse[];
  onClose: () => void;
}

export default function TradingHistorySidebar({
  selectedDate,
  tradingHistories,
  onClose,
}: TradingHistorySidebarProps) {
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [selectedTradingHistory, setSelectedTradingHistory] = useState<TradingHistoryResponse | null>(null);
  const panelRef = useRef<IndividualTradingHistoryPanelRef>(null);

  // selectedDate가 변경되면 선택된 거래 내역 초기화
  useEffect(() => {
    setSelectedTradingHistory(null);
  }, [selectedDate]);

  // 패널이 열릴 때 body에 padding-left 추가
  useEffect(() => {
    if (selectedDate) {
      document.documentElement.style.setProperty('--left-sidebar-width', '250px');
    } else {
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
    }
    
    return () => {
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
    };
  }, [selectedDate]);

  // 총매수/총매도 계산
  const { totalBuy, totalSell } = useMemo(() => {
    const buy = tradingHistories
      .filter((h) => h.tradeType === 0)
      .reduce((sum, h) => sum + (h.totalPrice || 0), 0);
    const sell = tradingHistories
      .filter((h) => h.tradeType === 1)
      .reduce((sum, h) => sum + (h.totalPrice || 0), 0);
    return { totalBuy: buy, totalSell: sell };
  }, [tradingHistories]);

  // 거래소 목록 추출 (해당 일자의 거래내역에서)
  const exchangeOptions = useMemo(() => {
    const exchanges = new Set<string>();
    tradingHistories.forEach((history) => {
      if (history.coin?.exchange) {
        exchanges.add(history.coin.exchange);
      }
    });
    return Array.from(exchanges).sort();
  }, [tradingHistories]);

  // 필터링 및 정렬된 거래내역
  const filteredAndSortedHistories = useMemo(() => {
    let filtered = tradingHistories;

    // 거래소 필터링
    if (selectedExchange) {
      filtered = filtered.filter((h) => h.coin?.exchange === selectedExchange);
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'latest':
          return new Date(b.tradeTime).getTime() - new Date(a.tradeTime).getTime();
        case 'oldest':
          return new Date(a.tradeTime).getTime() - new Date(b.tradeTime).getTime();
        case 'amount':
          return (b.totalPrice || 0) - (a.totalPrice || 0);
        case 'name':
          const nameA = (a.coin?.koreanName || a.coin?.symbol || '').toLowerCase();
          const nameB = (b.coin?.koreanName || b.coin?.symbol || '').toLowerCase();
          return nameA.localeCompare(nameB, 'ko');
        case 'profitHigh':
          // 매도 거래만 수익률이 있음, 매도 거래를 우선하고 수익률 높은 순으로 정렬
          const profitA = a.profitLossRate ?? (a.tradeType === 1 ? -Infinity : -Infinity - 1);
          const profitB = b.profitLossRate ?? (b.tradeType === 1 ? -Infinity : -Infinity - 1);
          // 매도 거래를 먼저 배치
          if (a.tradeType === 1 && b.tradeType === 0) return -1;
          if (a.tradeType === 0 && b.tradeType === 1) return 1;
          // 둘 다 매도 거래면 수익률 높은 순
          return profitB - profitA;
        case 'profitLow':
          // 매도 거래만 수익률이 있음, 매도 거래를 우선하고 수익률 낮은 순으로 정렬
          const profitALow = a.profitLossRate ?? (a.tradeType === 1 ? Infinity : Infinity + 1);
          const profitBLow = b.profitLossRate ?? (b.tradeType === 1 ? Infinity : Infinity + 1);
          // 매도 거래를 먼저 배치
          if (a.tradeType === 1 && b.tradeType === 0) return -1;
          if (a.tradeType === 0 && b.tradeType === 1) return 1;
          // 둘 다 매도 거래면 수익률 낮은 순
          return profitALow - profitBLow;
        default:
          return 0;
      }
    });

    return sorted;
  }, [tradingHistories, selectedExchange, sortOption]);

  if (!selectedDate) {
    return null;
  }

  const dateString = selectedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (tradingHistories.length === 0) {
    return (
      <div className="trading-history-sidebar">
        <div className="trading-history-sidebar-panel">
          <div className="trading-history-sidebar-header">
            <div className="trading-history-sidebar-title-wrapper">
              <h3 className="trading-history-sidebar-title">{dateString}</h3>
            </div>
            <button
              className="trading-history-sidebar-close"
              onClick={() => {
                setSelectedTradingHistory(null);
                onClose();
              }}
              aria-label="패널 닫기"
            >
              ×
            </button>
          </div>
          <div className="trading-history-sidebar-content">
            <div className="trading-history-empty">
              해당 날짜에 매매 내역이 없습니다.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trading-history-sidebar">
      <div className="trading-history-sidebar-panel">
        <div className="trading-history-sidebar-header">
          <div className="trading-history-sidebar-title-wrapper">
            <h3 className="trading-history-sidebar-title">{dateString}</h3>
          </div>
          <button
            className="trading-history-sidebar-close"
            onClick={() => {
              setSelectedTradingHistory(null);
              onClose();
            }}
            aria-label="패널 닫기"
          >
            ×
          </button>
        </div>
        <div className="trading-history-sidebar-content">
          <div className="trading-history-summary-rows">
            <div className="trading-history-summary-row">
              <div className="trading-history-summary-vertical-line"></div>
              <div className="trading-history-summary-content">
                <span className="trading-history-summary-label">일일총매수</span>
                <span className="trading-history-summary-value">
                  {formatCurrency(totalBuy)}
                </span>
              </div>
            </div>
            <div className="trading-history-summary-row">
              <div className="trading-history-summary-vertical-line"></div>
              <div className="trading-history-summary-content">
                <span className="trading-history-summary-label">일일총매도</span>
                <span className="trading-history-summary-value">
                  {formatCurrency(totalSell)}
                </span>
              </div>
            </div>
          </div>
          {/* 거래소 선택 및 정렬 셀렉트 박스 */}
          <div className="trading-history-filter-controls">
            <div className="trading-history-filter-group">
              <select
                id="trading-exchange-select"
                className="trading-history-filter-select"
                value={selectedExchange ?? ''}
                onChange={(e) => setSelectedExchange(e.target.value || null)}
              >
                <option value="">거래소 전체</option>
                {exchangeOptions.map((exchange) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))}
              </select>
            </div>
            <div className="trading-history-filter-group">
              <select
                id="trading-sort-select"
                className="trading-history-filter-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                <option value="latest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="amount">거래금액순</option>
                <option value="name">가나다순</option>
                <option value="profitHigh">수익률 높은순</option>
                <option value="profitLow">수익률 낮은순</option>
              </select>
            </div>
          </div>
          <div className="trading-history-list">
            {filteredAndSortedHistories.map((history) => {
              const coin = history.coin;
              const isBuy = history.tradeType === 0;
              const koreanName = coin?.koreanName || coin?.symbol || `코인 ${history.coinId}`;
              const marketCode = coin?.marketCode || '-';
              const exchange = coin?.exchange || '-';
              const tradeType = isBuy ? '매수' : '매도';
              const quantity = history.quantity || 0;
              const price = history.price || 0;
              const totalPrice = history.totalPrice || 0;

              const isSelected = selectedTradingHistory?.id === history.id;

              return (
                <div 
                  key={history.id} 
                  className={`trading-history-item ${isSelected ? 'selected' : ''}`}
                  onClick={async () => {
                    if (isSelected) {
                      setSelectedTradingHistory(null);
                    } else {
                      // 다른 매매일지 선택 전 변경사항 확인
                      if (panelRef.current?.hasUnsavedChanges()) {
                        const shouldSave = window.confirm('저장하지 않은 변경사항이 있습니다. 저장하시겠습니까?');
                        if (shouldSave) {
                          try {
                            await panelRef.current.handleSave();
                            setSelectedTradingHistory(history);
                          } catch (error) {
                            const shouldContinue = window.confirm('저장에 실패했습니다. 그래도 계속하시겠습니까?');
                            if (shouldContinue) {
                              setSelectedTradingHistory(history);
                            }
                          }
                        } else {
                          const shouldDiscard = window.confirm('변경사항을 저장하지 않고 계속하시겠습니까?');
                          if (shouldDiscard) {
                            setSelectedTradingHistory(history);
                          }
                        }
                    } else {
                      setSelectedTradingHistory(history);
                      }
                    }
                  }}
                >
                  <div className="trading-history-item-header">
                    <div className="trading-history-coin-info">
                      <div className="trading-history-coin-name">{koreanName}</div>
                      <div className="trading-history-coin-symbol">{coin?.marketCode || '-'}</div>
                    </div>
                    <div className="trading-history-trade-type-wrapper">
                      <div className={`trading-history-trade-type ${isBuy ? 'buy' : 'sell'}`}>
                        {tradeType}
                      </div>
                      {!isBuy ? (() => {
                        const profitLossRate = history.profitLossRate ?? 0;
                        const isPositive = profitLossRate >= 0;
                        const sign = isPositive ? '+' : '';
                        return (
                          <div className={`trading-history-profit-loss-rate ${isPositive ? 'positive' : 'negative'}`}>
                            {sign}{profitLossRate.toFixed(2)}%
                          </div>
                        );
                      })() : (
                        <div className="trading-history-profit-loss-rate" style={{ visibility: 'hidden' }}>
                          +0.00%
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="trading-history-item-details">
                    <div className="trading-history-detail-row">
                      <span className="trading-history-detail-label">거래수량</span>
                      <span className="trading-history-detail-value">
                        {truncateNumberWithUnit(`${formatQuantity(quantity)} ${coin?.symbol || ''}`)}
                      </span>
                    </div>
                    <div className="trading-history-detail-row">
                      <span className="trading-history-detail-label">거래단가</span>
                      <span className="trading-history-detail-value">{truncateIfLong(formatCurrency(price, coin?.quoteCurrency))}</span>
                    </div>
                    <div className="trading-history-detail-row">
                      <span className="trading-history-detail-label">총거래금액</span>
                      <span className="trading-history-detail-value">{truncateIfLong(formatCurrency(totalPrice, coin?.quoteCurrency))}</span>
                    </div>
                  </div>
                  {history.tradeTime && (
                    <div className="trading-history-trade-time">
                      <span className="trading-history-detail-value">
                        {`${new Date(history.tradeTime).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false,
                        })} KST`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {selectedTradingHistory && (
        <IndividualTradingHistoryPanel
          ref={panelRef}
          key={selectedTradingHistory.id}
          tradingHistory={selectedTradingHistory}
          onClose={() => setSelectedTradingHistory(null)}
        />
      )}
    </div>
  );
}

