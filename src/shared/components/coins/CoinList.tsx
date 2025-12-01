'use client';

import { useEffect, useState, useMemo, memo, useRef } from 'react';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useCoins } from '@/features/coins/hooks/useCoins';
import CoinItem from './CoinItem';
import CoinDetailSidebar from './CoinDetailSidebar';
import './CoinList.css';

const CurrencyTabs = memo(({ 
  selectedCurrency, 
  onCurrencyChange,
  searchQuery,
  onSearchChange
}: { 
  selectedCurrency: string; 
  onCurrencyChange: (currency: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) => {
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
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
});

CurrencyTabs.displayName = 'CurrencyTabs';

const marketIndicators = [
  { label: '달러환율', value: '1,350.50', change: '+2.30 (+0.17%)', type: 'positive' },
  { label: '나스닥', value: '14,234.56', change: '+45.23 (+0.32%)', type: 'positive' },
  { label: 'S&P 500', value: '4,567.89', change: '-12.34 (-0.27%)', type: 'negative' },
  { label: '다우존스', value: '34,567.12', change: '+123.45 (+0.36%)', type: 'positive' },
  { label: '코스피', value: '2,456.78', change: '+15.67 (+0.64%)', type: 'positive' },
  { label: '코스닥', value: '789.12', change: '-3.45 (-0.44%)', type: 'negative' },
];

type SortField = 'name' | 'price' | 'changeRate' | 'volume' | null;
type SortOrder = 'asc' | 'desc' | null;

// 한글 초성 추출 함수
const getInitialConsonant = (char: string): string | null => {
  const code = char.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    // 한글 유니코드 범위
    const initialConsonantIndex = Math.floor((code - 0xAC00) / 0x24C);
    const initialConsonants = [
      'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
      'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
    ];
    return initialConsonants[initialConsonantIndex];
  }
  return null;
};

// 한글 문자열의 초성 추출
const extractInitials = (text: string): string => {
  return text
    .split('')
    .map(char => getInitialConsonant(char) || char)
    .join('');
};

// 검색어가 한글 자음만으로 구성되어 있는지 확인
const isOnlyInitialConsonants = (query: string): boolean => {
  const initialConsonants = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  return query.split('').every(char => initialConsonants.includes(char));
};

export default function CoinList() {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KRW');
  const [selectedCoin, setSelectedCoin] = useState<CoinResponse | null>(null);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('volume'); // 기본값: 거래대금
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc'); // 기본값: 오름차순
  const [searchQuery, setSearchQuery] = useState<string>('');
  const indicatorsRef = useRef<HTMLDivElement>(null);

  // React Query를 사용한 코인 데이터 캐싱
  const { data: coins = [], isLoading: loading, error } = useCoins(selectedCurrency);

  // 사이드바가 열릴 때 body에 padding-left 추가
  useEffect(() => {
    if (selectedCoin) {
      document.documentElement.style.setProperty('--left-sidebar-width', '750px');
    } else {
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
    }
    
    return () => {
      if (!selectedCoin) {
        document.documentElement.style.setProperty('--left-sidebar-width', '0');
      }
    };
  }, [selectedCoin]);

  // 정렬 핸들러 (3단계: 오름차순 → 내림차순 → 해제)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 순서 토글
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        // 내림차순에서 다시 클릭하면 정렬 해제
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      // 다른 필드를 클릭하면 오름차순으로 시작
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 검색 필터링된 코인 목록
  const filteredCoins = useMemo(() => {
    if (!searchQuery.trim()) return coins;

    const query = searchQuery.trim();
    const isInitialOnly = isOnlyInitialConsonants(query);

    return coins.filter(coin => {
      const koreanName = coin.koreanName || '';
      const englishName = coin.englishName || '';

      if (isInitialOnly) {
        // 한글 자음만 입력된 경우
        const koreanInitials = extractInitials(koreanName);
        return koreanInitials.includes(query);
      } else {
        // 일반 검색 (한글 전체 또는 영어)
        // 한글명 검색
        const koreanMatch = koreanName.toLowerCase().includes(query.toLowerCase());
        
        // 영어명 검색 (대소문자 구분 없음, 마켓 코드 제외)
        const englishMatch = englishName 
          ? englishName.toLowerCase().includes(query.toLowerCase())
          : false;

        return koreanMatch || englishMatch;
      }
    });
  }, [coins, searchQuery]);

  // 정렬된 코인 목록
  const sortedCoins = useMemo(() => {
    if (!sortField || !sortOrder) return filteredCoins;

    const sorted = [...filteredCoins].sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;

      switch (sortField) {
        case 'name':
          aValue = (a.koreanName || a.marketCode || '').toLowerCase();
          bValue = (b.koreanName || b.marketCode || '').toLowerCase();
          break;
        case 'price':
          // 현재는 데이터가 없으므로 0으로 처리
          aValue = 0;
          bValue = 0;
          break;
        case 'changeRate':
          // 현재는 데이터가 없으므로 0으로 처리
          aValue = 0;
          bValue = 0;
          break;
        case 'volume':
          // 현재는 데이터가 없으므로 0으로 처리
          aValue = 0;
          bValue = 0;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return sorted;
  }, [filteredCoins, sortField, sortOrder]);

  // 마켓 인디케이터 무한 스크롤
  useEffect(() => {
    const scrollElement = indicatorsRef.current;
    if (!scrollElement) return;

    let animationFrameId: number | null = null;
    let isRunning = true;

    const updateScroll = () => {
      // 각 인디케이터의 너비 (250px) + gap (24px)
      const itemWidth = 250 + 24;
      const originalWidth = itemWidth * marketIndicators.length; // 원본 6개 요소의 총 너비
      let scrollPosition = 0;
      const scrollSpeed = 0.7; // 픽셀/프레임

      const animateScroll = () => {
        if (!isRunning || !scrollElement) return;

        scrollPosition += scrollSpeed;

        // 원본의 끝에 도달하면 복제본의 시작 부분으로 부드럽게 이동
        // 복제본이 원본과 동일하므로 끊김 없이 보임
        if (scrollPosition >= originalWidth) {
          scrollPosition = scrollPosition - originalWidth;
        }

        scrollElement.scrollLeft = scrollPosition;

        animationFrameId = requestAnimationFrame(animateScroll);
      };

      animateScroll();
    };

    // DOM이 완전히 렌더링된 후 실행
    const timeoutId = setTimeout(updateScroll, 100);

    return () => {
      isRunning = false;
      clearTimeout(timeoutId);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const coinListContent = useMemo(() => {
    if (loading) {
      return <div className="coin-list-loading">로딩 중...</div>;
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : '코인 목록을 불러오는데 실패했습니다.';
      return <div className="coin-list-error">{errorMessage}</div>;
    }

    return (
      <div className="coin-list">
        {sortedCoins.map((coin, index) => (
          <CoinItem 
            key={coin.id} 
            coin={coin} 
            rank={index + 1}
            isSelected={selectedCoin?.id === coin.id}
            onClick={() => {
              // 같은 코인을 다시 클릭하면 선택 해제
              if (selectedCoin?.id === coin.id) {
                setSelectedCoin(null);
              } else {
                setSelectedCoin(coin);
              }
            }}
          />
        ))}
      </div>
    );
  }, [sortedCoins, loading, error, selectedCoin]);

  return (
    <div className="coin-list-container">
      <div className="coin-list-market-indicators-wrapper">
        <div className="coin-list-market-indicator-schedule">📅 D-2 ISM 제조업 구매관리자지수 발표</div>
        <div className="coin-list-market-indicators" ref={indicatorsRef}>
          {/* 원본 인디케이터 */}
          {marketIndicators.map((indicator, index) => (
            <div key={`original-${index}`} className="coin-list-market-indicator">
              <div className="coin-list-market-indicator-chart"></div>
              <div className="coin-list-market-indicator-content">
                <span className="coin-list-market-indicator-label">{indicator.label}</span>
                <span className="coin-list-market-indicator-value">{indicator.value}</span>
                <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
              </div>
            </div>
          ))}
          {/* 복제본 인디케이터 (무한 루프를 위해) */}
          {marketIndicators.map((indicator, index) => (
            <div key={`duplicate-${index}`} className="coin-list-market-indicator">
              <div className="coin-list-market-indicator-chart"></div>
              <div className="coin-list-market-indicator-content">
                <span className="coin-list-market-indicator-label">{indicator.label}</span>
                <span className="coin-list-market-indicator-value">{indicator.value}</span>
                <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
              </div>
            </div>
          ))}
          {/* 두 번째 복제본 (부드러운 전환을 위해) */}
          {marketIndicators.map((indicator, index) => (
            <div key={`duplicate2-${index}`} className="coin-list-market-indicator">
              <div className="coin-list-market-indicator-chart"></div>
              <div className="coin-list-market-indicator-content">
                <span className="coin-list-market-indicator-label">{indicator.label}</span>
                <span className="coin-list-market-indicator-value">{indicator.value}</span>
                <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="coin-list-content-wrapper">
        <CurrencyTabs 
          selectedCurrency={selectedCurrency} 
          onCurrencyChange={setSelectedCurrency}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="coin-list-wrapper">
          <div className="coin-list-header">
            <div 
              className="coin-list-header-section coin-list-header-info coin-list-header-sortable"
              onClick={() => handleSort('name')}
            >
              <span className="coin-list-header-label">종목명</span>
              <div className="coin-list-header-sort-icons">
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-up ${
                    sortField === 'name' && sortOrder === 'asc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'name' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>
            <div 
              className="coin-list-header-section coin-list-header-price coin-list-header-sortable"
              onClick={() => handleSort('price')}
            >
              <span className="coin-list-header-label">현재가</span>
              <div className="coin-list-header-sort-icons">
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-up ${
                    sortField === 'price' && sortOrder === 'asc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'price' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>
            <div 
              className="coin-list-header-section coin-list-header-change coin-list-header-sortable"
              onClick={() => handleSort('changeRate')}
            >
              <span className="coin-list-header-label">등락율</span>
              <div className="coin-list-header-sort-icons">
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-up ${
                    sortField === 'changeRate' && sortOrder === 'asc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'changeRate' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>
            <div 
              className="coin-list-header-section coin-list-header-volume coin-list-header-sortable"
              onClick={() => handleSort('volume')}
            >
              <span className="coin-list-header-label">거래대금</span>
              <div className="coin-list-header-sort-icons">
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-up ${
                    sortField === 'volume' && sortOrder === 'asc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'volume' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>
          </div>
          {coinListContent}
        </div>
      </div>
      <CoinDetailSidebar 
        coin={selectedCoin} 
        isClosing={isSidebarClosing}
        onClose={() => {
          setIsSidebarClosing(true);
          // 애니메이션 시간만큼 대기 후 실제로 닫기
          setTimeout(() => {
            setSelectedCoin(null);
            setIsSidebarClosing(false);
          }, 300);
        }} 
      />
    </div>
  );
}

