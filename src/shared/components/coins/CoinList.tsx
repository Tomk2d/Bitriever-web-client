'use client';

import { useEffect, useState, useMemo, memo, useRef } from 'react';
import { coinService, CoinResponse } from '@/features/coins/services/coinService';
import CoinItem from './CoinItem';
import './CoinList.css';

const CurrencyTabs = memo(({ selectedCurrency, onCurrencyChange }: { selectedCurrency: string; onCurrencyChange: (currency: string) => void }) => {
  return (
    <div className="coin-list-currency-tabs">
      <div className="coin-list-currency-tabs-left">
        <button
          className={`coin-list-currency-tab ${selectedCurrency === 'KRW' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('KRW')}
        >
          원화
        </button>
        <button
          className={`coin-list-currency-tab ${selectedCurrency === 'BTC' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('BTC')}
        >
          BTC
        </button>
        <button
          className={`coin-list-currency-tab ${selectedCurrency === 'USDT' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('USDT')}
        >
          USDT
        </button>
      </div>
      <div className="coin-list-currency-tabs-right">
        <div className="coin-list-search">
          <input
            type="text"
            className="coin-list-search-input"
            placeholder="코인명/심볼 검색"
            aria-label="코인 검색"
          />
        </div>
      </div>
    </div>
  );
});

CurrencyTabs.displayName = 'CurrencyTabs';

export default function CoinList() {
  const [coins, setCoins] = useState<CoinResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KRW');
  const indicatorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await coinService.getAllByQuoteCurrency(selectedCurrency);
        setCoins(data);
      } catch (err) {
        console.error('코인 목록 조회 실패:', err);
        setError('코인 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, [selectedCurrency]);

  const coinListContent = useMemo(() => {
    if (loading) {
      return <div className="coin-list-loading">로딩 중...</div>;
    }

    if (error) {
      return <div className="coin-list-error">{error}</div>;
    }

    return (
      <div className="coin-list">
        {coins.map((coin, index) => (
          <CoinItem key={coin.id} coin={coin} rank={index + 1} />
        ))}
      </div>
    );
  }, [coins, loading, error]);

  return (
    <div className="coin-list-container">
      <div className="coin-list-market-indicators-wrapper">
        <div className="coin-list-market-indicator-schedule">📅 D-2 ISM 제조업 구매관리자지수 발표</div>
        <div className="coin-list-market-indicators" ref={indicatorsRef}>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">달러환율</span>
              <span className="coin-list-market-indicator-value">1,350.50</span>
              <span className="coin-list-market-indicator-change positive">+2.30 (+0.17%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
          {/* 추가 복제본으로 끊김 방지 */}
          <div className="coin-list-market-indicator-item">
            <div className="coin-list-market-indicator-schedule">D-2 ISM 제조업 구매관리자지수 발표</div>
            <div className="coin-list-market-indicator">
              <div className="coin-list-market-indicator-chart"></div>
              <div className="coin-list-market-indicator-content">
                <span className="coin-list-market-indicator-label">달러환율</span>
                <span className="coin-list-market-indicator-value">1,350.50</span>
                <span className="coin-list-market-indicator-change positive">+2.30 (+0.17%)</span>
              </div>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
          {/* 네 번째 복제본으로 끊김 완전 방지 */}
          <div className="coin-list-market-indicator-item">
            <div className="coin-list-market-indicator-schedule">D-2 ISM 제조업 구매관리자지수 발표</div>
            <div className="coin-list-market-indicator">
              <div className="coin-list-market-indicator-chart"></div>
              <div className="coin-list-market-indicator-content">
                <span className="coin-list-market-indicator-label">달러환율</span>
                <span className="coin-list-market-indicator-value">1,350.50</span>
                <span className="coin-list-market-indicator-change positive">+2.30 (+0.17%)</span>
              </div>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
          {/* 다섯 번째 복제본으로 끊김 완전 방지 */}
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">달러환율</span>
              <span className="coin-list-market-indicator-value">1,350.50</span>
              <span className="coin-list-market-indicator-change positive">+2.30 (+0.17%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
          {/* 여섯 번째 복제본으로 끊김 완전 방지 */}
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">달러환율</span>
              <span className="coin-list-market-indicator-value">1,350.50</span>
              <span className="coin-list-market-indicator-change positive">+2.30 (+0.17%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">나스닥</span>
              <span className="coin-list-market-indicator-value">14,234.56</span>
              <span className="coin-list-market-indicator-change positive">+45.23 (+0.32%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">S&P 500</span>
              <span className="coin-list-market-indicator-value">4,567.89</span>
              <span className="coin-list-market-indicator-change negative">-12.34 (-0.27%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">다우존스</span>
              <span className="coin-list-market-indicator-value">34,567.12</span>
              <span className="coin-list-market-indicator-change positive">+123.45 (+0.36%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스피</span>
              <span className="coin-list-market-indicator-value">2,456.78</span>
              <span className="coin-list-market-indicator-change positive">+15.67 (+0.64%)</span>
            </div>
          </div>
          <div className="coin-list-market-indicator">
            <div className="coin-list-market-indicator-chart"></div>
            <div className="coin-list-market-indicator-content">
              <span className="coin-list-market-indicator-label">코스닥</span>
              <span className="coin-list-market-indicator-value">789.12</span>
              <span className="coin-list-market-indicator-change negative">-3.45 (-0.44%)</span>
            </div>
          </div>
        </div>
      </div>
      <div className="coin-list-content-wrapper">
        <CurrencyTabs selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
        <div className="coin-list-wrapper">
          <div className="coin-list-header">
            <div className="coin-list-header-section coin-list-header-info">
              <span className="coin-list-header-label">종목명</span>
            </div>
            <div className="coin-list-header-section coin-list-header-price">
              <span className="coin-list-header-label">현재가</span>
            </div>
            <div className="coin-list-header-section coin-list-header-change">
              <span className="coin-list-header-label">등락율</span>
            </div>
            <div className="coin-list-header-section coin-list-header-volume">
              <span className="coin-list-header-label">거래대금</span>
            </div>
          </div>
          {coinListContent}
        </div>
      </div>
    </div>
  );
}

