'use client';

import { useState } from 'react';
import { TopCoinResponse } from '../types';
import { formatCurrency } from '@/features/asset/utils/assetCalculations';
import './TopCoinsList.css';

interface TopCoinsListProps {
  data: TopCoinResponse;
}

const PAGE_SIZE = 5;

export default function TopCoinsList({ data }: TopCoinsListProps) {
  const [profitVisibleCount, setProfitVisibleCount] = useState(PAGE_SIZE);
  const [lossVisibleCount, setLossVisibleCount] = useState(PAGE_SIZE);

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getProfitColor = (value: number) => {
    return value >= 0 ? 'var(--price-up)' : 'var(--price-down)';
  };

  const hasMoreProfit = profitVisibleCount < data.topProfitCoins.length;
  const hasMoreLoss = lossVisibleCount < data.topLossCoins.length;

  return (
    <div className="top-coins-list">
      <div className="top-coins-section">
        <h3 className="top-coins-title">가장 많이 벌어준 종목</h3>
        {data.topProfitCoins.length === 0 ? (
          <div className="top-coins-empty">데이터가 없습니다.</div>
        ) : (
          <>
            <div className="top-coins-items">
              {data.topProfitCoins.slice(0, profitVisibleCount).map(
                (coin, index) => (
                  <div
                    key={`${coin.coin?.symbol || 'profit'}-${index}`}
                    className="top-coins-item"
                  >
                    <div className="top-coins-rank">
                      {coin.coin?.imgUrl ? (
                        <img
                          src={coin.coin.imgUrl}
                          alt={coin.coin.koreanName || coin.coin.symbol || '코인 심볼'}
                          className="top-coins-symbol"
                        />
                      ) : (
                        <span className="top-coins-rank-fallback">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="top-coins-info">
                      <div className="top-coins-name">
                        {coin.coin?.koreanName || coin.coin?.symbol || '알 수 없음'}
                      </div>
                      <div className="top-coins-details">
                        <span>매도 {coin.sellCount}건</span>
                        <span>
                          평균{' '}
                          <span
                            style={{
                              color: 'var(--price-up)',
                              fontWeight: 500,
                            }}
                          >
                            {formatPercentage(coin.averageProfitRate)}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div
                      className="top-coins-profit"
                      style={{ color: getProfitColor(coin.totalProfit) }}
                    >
                      {coin.totalProfit > 0 ? '+' : ''}
                      {formatCurrency(coin.totalProfit)}
                    </div>
                  </div>
                ),
              )}
            </div>
            {hasMoreProfit && (
              <button
                type="button"
                className="top-coins-more-button"
                onClick={() =>
                  setProfitVisibleCount((prev) =>
                    Math.min(prev + PAGE_SIZE, data.topProfitCoins.length),
                  )
                }
              >
                더보기
              </button>
            )}
          </>
        )}
      </div>

      <div className="top-coins-section">
        <h3 className="top-coins-title">가장 많이 잃게한 종목</h3>
        {data.topLossCoins.length === 0 ? (
          <div className="top-coins-empty">데이터가 없습니다.</div>
        ) : (
          <>
            <div className="top-coins-items">
              {data.topLossCoins.slice(0, lossVisibleCount).map((coin, index) => (
                <div
                  key={`${coin.coin?.symbol || 'loss'}-${index}`}
                  className="top-coins-item"
                >
                  <div className="top-coins-rank">
                    {coin.coin?.imgUrl ? (
                      <img
                        src={coin.coin.imgUrl}
                        alt={coin.coin.koreanName || coin.coin.symbol || '코인 심볼'}
                        className="top-coins-symbol"
                      />
                    ) : (
                      <span className="top-coins-rank-fallback">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="top-coins-info">
                    <div className="top-coins-name">
                      {coin.coin?.koreanName || coin.coin?.symbol || '알 수 없음'}
                    </div>
                    <div className="top-coins-details">
                      <span>매도 {coin.sellCount}건</span>
                      <span>
                        평균{' '}
                        <span
                          style={{
                            color: 'var(--price-down)',
                            fontWeight: 500,
                          }}
                        >
                          {formatPercentage(coin.averageProfitRate)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div
                    className="top-coins-profit"
                    style={{ color: getProfitColor(coin.totalProfit) }}
                  >
                    {coin.totalProfit > 0 ? '+' : ''}
                    {formatCurrency(coin.totalProfit)}
                  </div>
                </div>
              ))}
            </div>
            {hasMoreLoss && (
              <button
                type="button"
                className="top-coins-more-button"
                onClick={() =>
                  setLossVisibleCount((prev) =>
                    Math.min(prev + PAGE_SIZE, data.topLossCoins.length),
                  )
                }
              >
                더보기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
