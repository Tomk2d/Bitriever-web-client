'use client';

import { useEffect, useState, useMemo, memo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CoinResponse } from '@/features/coins/services/coinService';
import { useCoins } from '@/features/coins/hooks/useCoins';
import { useAppSelector } from '@/store/hooks';
import { selectAllPrices } from '@/store/slices/coinPriceSlice';
import { useEconomicIndices } from '@/features/economicIndex/hooks/useEconomicIndices';
import { useTodayEventCount } from '@/features/economicEvent/hooks/useTodayEventCount';
import { useEconomicEventsPrefetch } from '@/features/economicEvent/hooks/useEconomicEventsByMonth';
import CoinItem from './CoinItem';
import CoinDetailSidebar from './CoinDetailSidebar';
import EconomicCalendarSidebar from './EconomicCalendarSidebar';
import MarketIndicatorChart from './MarketIndicatorChart';
import { useAssets } from '@/features/asset/hooks/useAssets';
import './CoinList.css';

type TopTab = 'KRW' | 'BTC' | 'USDT' | 'HOLDINGS';

const CurrencyTabs = memo(({ 
  selectedTab, 
  onTabChange,
  searchQuery,
  onSearchChange,
}: { 
  selectedTab: TopTab; 
  onTabChange: (tab: TopTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) => {
  return (
    <div className="coin-list-currency-tabs">
      <div className="coin-list-currency-tabs-inner">
      <div className="coin-list-currency-tabs-left">
        <button
          className={`coin-list-currency-tab ${selectedTab === 'KRW' ? 'active' : ''}`}
          onClick={() => onTabChange('KRW')}
        >
          원화
        </button>
        <button
          className={`coin-list-currency-tab ${selectedTab === 'BTC' ? 'active' : ''}`}
          onClick={() => onTabChange('BTC')}
        >
          BTC
        </button>
        <button
          className={`coin-list-currency-tab ${selectedTab === 'USDT' ? 'active' : ''}`}
          onClick={() => onTabChange('USDT')}
        >
          USDT
        </button>
        <button
          className={`coin-list-currency-tab ${selectedTab === 'HOLDINGS' ? 'active' : ''}`}
          onClick={() => onTabChange('HOLDINGS')}
        >
          보유 종목
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
      <div className="coin-list-currency-tabs-line" aria-hidden />
    </div>
  );
});

CurrencyTabs.displayName = 'CurrencyTabs';

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
  const pathname = usePathname();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<TopTab>('KRW');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('KRW');
  const [selectedCoin, setSelectedCoin] = useState<CoinResponse | null>(null);
  const [isSidebarClosing, setIsSidebarClosing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCalendarClosing, setIsCalendarClosing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('volume'); // 기본값: 거래대금
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // 기본값: 내림차순
  const [searchQuery, setSearchQuery] = useState<string>(''); // 입력값
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(''); // debounce된 검색어
  const [isMounted, setIsMounted] = useState(false); // 클라이언트 마운트 여부
  const indicatorsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 클라이언트 마운트 확인 (Hydration 에러 방지)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // React Query를 사용한 코인/자산 데이터 캐싱
  const enableCoinsQuery = selectedTab !== 'HOLDINGS';
  const { data: coins = [], isLoading: loading, error, isFetching } = useCoins(
    enableCoinsQuery ? selectedCurrency : 'KRW'
  );
  const { data: assets = [] } = useAssets(true);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const connectedExchanges = useAppSelector((state) => state.auth.user?.connectedExchanges || []);
  const hasConnectedExchange = connectedExchanges.length > 0;
  
  // Redux에서 가격 데이터 가져오기
  const priceData = useAppSelector(selectAllPrices);

  // 경제 지표 데이터 가져오기 (10분마다 polling)
  const { indicators: marketIndicators = [], loading: indicatorsLoading } = useEconomicIndices();
  
  // 오늘 예정된 경제 이벤트 개수 가져오기 (5분마다 polling)
  const { count: todayEventCount, loading: eventCountLoading } = useTodayEventCount();
  
  // 경제 캘린더 데이터 prefetch (현재월부터 +2개월)
  useEconomicEventsPrefetch();

  // 페이지 이동 시 사이드바 닫기 및 상태 초기화
  useEffect(() => {
    if (pathname !== '/coins') {
      // 즉시 CSS 변수 초기화 (다른 페이지로 이동 시 body가 밀리지 않도록)
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
      
      if (selectedCoin) {
        // 사이드바 닫기 애니메이션 시작
        setIsSidebarClosing(true);
        // 애니메이션 시간만큼 대기 후 실제로 닫기 및 상태 초기화
        setTimeout(() => {
          setSelectedCoin(null);
          setIsSidebarClosing(false);
        }, 300);
      }
    }
  }, [pathname, selectedCoin]);

  // 검색어 debounce 처리 (300ms 지연)
  useEffect(() => {
    // 이전 타이머가 있으면 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 300ms 후에 debouncedSearchQuery 업데이트
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    // cleanup 함수
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // 사이드바가 열릴 때 body에 padding-left 추가 (coins 페이지에서만)
  useEffect(() => {
    // coins 페이지가 아니면 CSS 변수를 설정하지 않음
    if (pathname !== '/coins') {
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
      return;
    }
    
    if (selectedCoin || isCalendarOpen) {
      document.documentElement.style.setProperty('--left-sidebar-width', '750px');
    } else {
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
    }
  }, [selectedCoin, isCalendarOpen, pathname]);

  // 컴포넌트 언마운트 시 항상 CSS 변수 초기화 (다른 페이지로 이동 시 body가 밀리지 않도록)
  useEffect(() => {
    return () => {
      // 컴포넌트가 언마운트될 때 항상 CSS 변수 초기화
      document.documentElement.style.setProperty('--left-sidebar-width', '0');
    };
  }, []);

  // 정렬 핸들러 (3단계: 내림차순 → 오름차순 → 해제)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 순서 토글
      if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else if (sortOrder === 'asc') {
        // 오름차순에서 다시 클릭하면 정렬 해제
        setSortField(null);
        setSortOrder(null);
      }
    } else {
      // 다른 필드를 클릭하면 내림차순으로 시작
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 보유 종목 탭에서 사용할 코인 목록 (원화/BTC/USDT 전체 보유 종목, KRW-KRW 제외)
  const holdingCoins = useMemo<CoinResponse[]>(() => {
    if (!assets || assets.length === 0) return [];

    const map = new Map<string, CoinResponse>();

    assets.forEach((asset) => {
      if (!asset.coin) return;
      if (asset.symbol === 'KRW') return; // KRW-KRW 제외
      if ((asset.quantity || 0) <= 0) return;

      const marketCode = asset.coin.marketCode;
      if (!marketCode || marketCode === 'KRW-KRW') return;

      if (!map.has(marketCode)) {
        map.set(marketCode, asset.coin);
      }
    });

    return Array.from(map.values());
  }, [assets]);

  // 검색 + 탭(보유 종목/통화) 필터링된 코인 목록 (debouncedSearchQuery 사용)
  const filteredCoins = useMemo(() => {
    const baseList =
      selectedTab === 'HOLDINGS'
        ? holdingCoins
        : coins;

    if (!debouncedSearchQuery.trim()) return baseList;

    const query = debouncedSearchQuery.trim().toLowerCase();
    const isInitialOnly = isOnlyInitialConsonants(query);

    return baseList.filter(coin => {
      const koreanName = coin.koreanName || '';
      const englishName = coin.englishName || '';
      const symbol = coin.symbol || '';

      if (isInitialOnly) {
        // 한글 자음만 입력된 경우
        const koreanInitials = extractInitials(koreanName);
        return koreanInitials.includes(query);
      } else {
        // 일반 검색 (한글명, 영어명, 심볼 검색)
        // 한글명 검색
        const koreanMatch = koreanName.toLowerCase().includes(query);
        
        // 영어명 검색
        const englishMatch = englishName 
          ? englishName.toLowerCase().includes(query)
          : false;

        // 심볼 검색
        const symbolMatch = symbol.toLowerCase().includes(query);

        return koreanMatch || englishMatch || symbolMatch;
      }
    });
  }, [coins, debouncedSearchQuery, selectedTab, holdingCoins]);

  // 정렬된 코인 목록 (클라이언트에서만 정렬 적용하여 Hydration 에러 방지)
  const sortedCoins = useMemo(() => {
    // 서버 렌더링 시점에는 정렬하지 않고 원본 순서 유지
    if (!isMounted) {
      return filteredCoins;
    }

    // 클라이언트에서만 정렬 적용
    const sorted = [...filteredCoins].sort((a, b) => {
      // 기본 정렬: id 순서 (안정적인 정렬을 위해)
      if (!sortField || !sortOrder) {
        return a.id - b.id;
      }

      // 사용자가 선택한 정렬 필드에 따라 정렬
      let aValue: string | number = 0;
      let bValue: string | number = 0;

      switch (sortField) {
        case 'name':
          aValue = (a.koreanName || a.marketCode || '').toLowerCase();
          bValue = (b.koreanName || b.marketCode || '').toLowerCase();
          break;
        case 'price':
          // Redux에서 가격 데이터 가져오기
          const aPriceData = priceData[a.marketCode];
          const bPriceData = priceData[b.marketCode];
          aValue = aPriceData?.tradePrice || 0;
          bValue = bPriceData?.tradePrice || 0;
          break;
        case 'changeRate':
          // Redux에서 등락율 데이터 가져오기 (signedChangeRate 우선 사용)
          const aChangeData = priceData[a.marketCode];
          const bChangeData = priceData[b.marketCode];
          aValue = aChangeData?.signedChangeRate !== undefined && aChangeData?.signedChangeRate !== null
            ? aChangeData.signedChangeRate
            : (aChangeData?.changeRate || 0);
          bValue = bChangeData?.signedChangeRate !== undefined && bChangeData?.signedChangeRate !== null
            ? bChangeData.signedChangeRate
            : (bChangeData?.changeRate || 0);
          break;
        case 'volume':
          // Redux에서 거래대금 데이터 가져오기
          const aVolumeData = priceData[a.marketCode];
          const bVolumeData = priceData[b.marketCode];
          aValue = aVolumeData?.accTradePrice24h || 0;
          bValue = bVolumeData?.accTradePrice24h || 0;
          break;
        default:
          // 기본 정렬: id 순서
          return a.id - b.id;
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
  }, [filteredCoins, sortField, sortOrder, priceData, isMounted]);

  // 마켓 인디케이터 무한 스크롤
  useEffect(() => {
    const scrollElement = indicatorsRef.current;
    if (!scrollElement || marketIndicators.length === 0) return;

    let animationFrameId: number | null = null;
    let isRunning = true;

    const updateScroll = () => {
      // 각 인디케이터의 너비 (250px) + gap (24px)
      const itemWidth = 250 + 24;
      const originalWidth = itemWidth * marketIndicators.length;
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
  }, [marketIndicators.length]);

  const coinListContent = useMemo(() => {
    // 클라이언트 마운트 후에만 로딩 상태 체크 (Hydration 에러 방지)
    if (isMounted && loading && coins.length === 0) {
      return <div className="coin-list-loading">로딩 중...</div>;
    }

    // 서버 렌더링 시점에는 로딩 표시하지 않음 (데이터가 없어도 빈 리스트 표시)
    if (!isMounted && coins.length === 0) {
      return (
        <div className="coin-list">
          {/* 서버 렌더링 시 빈 리스트 */}
        </div>
      );
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : '코인 목록을 불러오는데 실패했습니다.';
      return <div className="coin-list-error">{errorMessage}</div>;
    }

    // 보유 종목 탭 전용 안내 UI
    if (selectedTab === 'HOLDINGS') {
      // 1) 비로그인 상태
      if (!isAuthenticated) {
        return (
          <div className="coin-list">
            <div className="coin-list-empty-state">
              <p className="coin-list-empty-text">로그인 후 이용해주세요.</p>
              <button
                type="button"
                className="wallet-asset-list-connect-button coin-list-empty-button"
                onClick={() => router.push('/login')}
              >
                로그인
              </button>
            </div>
          </div>
        );
      }

      // 2) 로그인은 되었지만 거래소 연동이 없는 경우
      if (!hasConnectedExchange) {
        return (
          <div className="coin-list">
            <div className="coin-list-empty-state">
              <p className="coin-list-empty-text">거래소 연동 후 이용해주세요.</p>
              <button
                type="button"
                className="wallet-asset-list-connect-button coin-list-empty-button"
                onClick={() => router.push('/mypage/exchanges')}
              >
                거래소 연동하기
              </button>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="coin-list">
        {sortedCoins.map((coin, index) => (
          <CoinItem 
            key={coin.id} 
            coin={coin} 
            rank={index + 1}
            isSelected={selectedCoin?.id === coin.id}
            selectedCurrency={selectedCurrency}
            onClick={() => {
              // 같은 코인을 다시 클릭하면 선택 해제
              if (selectedCoin?.id === coin.id) {
                setSelectedCoin(null);
              } else {
                // 경제 이벤트 사이드바가 열려있으면 닫기
                if (isCalendarOpen) {
                  setIsCalendarClosing(true);
                  setTimeout(() => {
                    setIsCalendarOpen(false);
                    setIsCalendarClosing(false);
                  }, 300);
                }
                setSelectedCoin(coin);
              }
            }}
          />
        ))}
      </div>
    );
  }, [
    sortedCoins,
    loading,
    error,
    selectedCoin,
    isMounted,
    coins.length,
    isCalendarOpen,
    selectedTab,
    isAuthenticated,
    hasConnectedExchange,
    router,
  ]);

  return (
    <div className="coin-list-container">
      <div className="coin-list-market-indicators-wrapper">
        <div 
          className="coin-list-market-indicator-schedule"
          onClick={() => {
            // 코인 상세 사이드바가 열려있으면 닫기
            if (selectedCoin) {
              setIsSidebarClosing(true);
              setTimeout(() => {
                setSelectedCoin(null);
                setIsSidebarClosing(false);
              }, 300);
            }
            setIsCalendarOpen(true);
            setIsCalendarClosing(false);
          }}
        >
          {eventCountLoading ? (
            '경제 이벤트 로딩 중...'
          ) : (
            <>
              오늘 예정된 경제 이벤트가 <span className="coin-list-event-count">{todayEventCount}개</span> 있어요
              <span className="coin-list-schedule-arrow"> →</span>
            </>
          )}
        </div>
        {indicatorsLoading && marketIndicators.length === 0 ? (
          <div className="coin-list-market-indicators">
            <div className="coin-list-loading">경제 지표 로딩 중...</div>
          </div>
        ) : (
          <div className="coin-list-market-indicators" ref={indicatorsRef}>
            {/* 원본 인디케이터 */}
            {marketIndicators.map((indicator, index) => (
              <div key={`original-${indicator.indexType}-${index}`} className="coin-list-market-indicator">
                <MarketIndicatorChart 
                  data={indicator.data} 
                  isPositive={indicator.type === 'positive'} 
                />
                <div className="coin-list-market-indicator-content">
                  <span className="coin-list-market-indicator-label">{indicator.label}</span>
                  <span className={`coin-list-market-indicator-value ${indicator.type}`}>{indicator.value}</span>
                  <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
                </div>
              </div>
            ))}
            {/* 복제본 인디케이터 (무한 루프를 위해) */}
            {marketIndicators.map((indicator, index) => (
              <div key={`duplicate-${indicator.indexType}-${index}`} className="coin-list-market-indicator">
                <MarketIndicatorChart 
                  data={indicator.data} 
                  isPositive={indicator.type === 'positive'} 
                />
                <div className="coin-list-market-indicator-content">
                  <span className="coin-list-market-indicator-label">{indicator.label}</span>
                  <span className={`coin-list-market-indicator-value ${indicator.type}`}>{indicator.value}</span>
                  <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
                </div>
              </div>
            ))}
            {/* 두 번째 복제본 (부드러운 전환을 위해) */}
            {marketIndicators.map((indicator, index) => (
              <div key={`duplicate2-${indicator.indexType}-${index}`} className="coin-list-market-indicator">
                <MarketIndicatorChart 
                  data={indicator.data} 
                  isPositive={indicator.type === 'positive'} 
                />
                <div className="coin-list-market-indicator-content">
                  <span className="coin-list-market-indicator-label">{indicator.label}</span>
                  <span className={`coin-list-market-indicator-value ${indicator.type}`}>{indicator.value}</span>
                  <span className={`coin-list-market-indicator-change ${indicator.type}`}>{indicator.change}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="coin-list-content-wrapper">
        <CurrencyTabs 
          selectedTab={selectedTab} 
          onTabChange={(tab) => {
            setSelectedTab(tab);
            if (tab === 'KRW' || tab === 'BTC' || tab === 'USDT') {
              setSelectedCurrency(tab);
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <div className="coin-list-wrapper">
          <div className="coin-list-header">
            <div className="coin-list-header-inner">
            <div 
              className="coin-list-header-section coin-list-header-info coin-list-header-sortable"
              onClick={() => handleSort('name')}
            >
              <span className="coin-list-header-label">종목명</span>
              <div className="coin-list-header-sort-icons">
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-up ${
                    sortField === 'name' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'name' && sortOrder === 'asc' ? 'active' : ''
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
                    sortField === 'price' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'price' && sortOrder === 'asc' ? 'active' : ''
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
                    sortField === 'changeRate' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'changeRate' && sortOrder === 'asc' ? 'active' : ''
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
                    sortField === 'volume' && sortOrder === 'desc' ? 'active' : ''
                  }`}
                >
                  ▲
                </span>
                <span 
                  className={`coin-list-header-sort-icon coin-list-header-sort-down ${
                    sortField === 'volume' && sortOrder === 'asc' ? 'active' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
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
      <EconomicCalendarSidebar
        isOpen={isCalendarOpen}
        isClosing={isCalendarClosing}
        onClose={() => {
          setIsCalendarClosing(true);
          // 애니메이션 시간만큼 대기 후 실제로 닫기
          setTimeout(() => {
            setIsCalendarOpen(false);
            setIsCalendarClosing(false);
          }, 300);
        }}
      />
    </div>
  );
}

