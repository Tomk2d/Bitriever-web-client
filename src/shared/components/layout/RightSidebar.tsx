'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleTheme } from '@/store/slices/uiSlice';
import { selectAllPrices } from '@/store/slices/coinPriceSlice';
import { useAssets } from '@/features/asset/hooks/useAssets';
import { assetService } from '@/features/asset/services/assetService';
import {
  getKRWAsset,
  getTotalKRW,
  getUSDTAsset,
  getBTCAsset,
  getTotalCoinAssets,
  getTotalAssets,
  formatCurrency,
  formatNumber,
} from '@/features/asset/utils/assetCalculations';
import WalletAssetList from './WalletAssetList';
import { NotificationList } from '@/features/notification/components/NotificationList';
import { useUnreadNotificationCount } from '@/features/notification/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { inquiryService } from '@/features/inquiry/services/inquiryService';
import './RightSidebar.css';

type MenuType = 'wallet' | 'chatbot' | 'notification' | 'faq' | 'settings' | null;

type SortOption = 'holdings' | 'profit-high' | 'profit-low' | 'name';

export default function RightSidebar() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState<MenuType>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const [selectedExchangeCode, setSelectedExchangeCode] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('holdings');
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // FAQ state
  const [openFaqId, setOpenFaqId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  
  // Redux에서 유저 정보 가져오기
  const user = useAppSelector((state) => state.auth.user);
  
  // Redux에서 가격 데이터 가져오기
  const priceData = useAppSelector(selectAllPrices);
  
  // Redux에서 테마 정보 가져오기
  const theme = useAppSelector((state) => state.ui.theme);
  
  // 자산 데이터 가져오기 (wallet 메뉴 선택 시에만 활성화)
  const shouldFetchAssets = selectedMenu === 'wallet' && isPanelOpen;
  const { data: assets = [], isLoading: isAssetsLoading, refetch } = useAssets(shouldFetchAssets);
  
  // 읽지 않은 알림 개수
  const { data: unreadCount } = useUnreadNotificationCount();
  
  // 거래소 목록 (code 순으로 정렬)
  const exchangeOptions = useMemo(() => {
    if (!user?.connectedExchanges || user.connectedExchanges.length === 0) {
      return [];
    }
    return [...user.connectedExchanges].sort((a, b) => a.code - b.code);
  }, [user?.connectedExchanges]);
  
  // 필터링된 자산 (거래소 선택 시)
  const filteredAssets = useMemo(() => {
    if (selectedExchangeCode === null) {
      return assets;
    }
    return assets.filter((asset) => asset.exchangeCode === selectedExchangeCode);
  }, [assets, selectedExchangeCode]);

  const handleMenuClick = (menu: MenuType) => {
    if (selectedMenu === menu && isPanelOpen) {
      // 같은 메뉴를 클릭하면 패널 닫기
      setIsPanelOpen(false);
      setSelectedMenu(null);
      
      // 알림 패널을 닫을 때 알림 캐시 무효화하여 다음에 열 때 최신 데이터 가져오기
      if (menu === 'notification') {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite'] });
      }
    } else {
      // 다른 메뉴를 클릭하면 패널 열고 메뉴 변경
      setSelectedMenu(menu);
      setIsPanelOpen(true);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshDisabled) return;

    try {
      await assetService.syncAssets();
      // 자산 데이터 다시 가져오기
      refetch();
      
      // 5분간 비활성화
      setIsRefreshDisabled(true);
      setRefreshCountdown(300); // 5분 = 300초
    } catch (error) {
      console.error('자산 동기화 실패:', error);
    }
  };

  // 카운트다운 타이머
  useEffect(() => {
    if (refreshCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            setIsRefreshDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [refreshCountdown]);

  return (
    <>
      <aside className="right-sidebar">
        <div className="sidebar-content">
          {/* 상단 메뉴 */}
          <div className="sidebar-section sidebar-top">
            <button
              className={`sidebar-menu-item ${selectedMenu === 'wallet' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('wallet')}
            >
              <span className="sidebar-icon">💰</span>
              <span className="sidebar-text">내 자산</span>
            </button>
            <button
              className={`sidebar-menu-item ${selectedMenu === 'chatbot' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('chatbot')}
            >
              <span className="sidebar-icon">📜</span>
              <span className="sidebar-text">자격증</span>
            </button>
            <button
              className={`sidebar-menu-item ${selectedMenu === 'notification' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('notification')}
            >
              <span className="sidebar-icon">🔔</span>
              <span className="sidebar-text">알림</span>
              {unreadCount && unreadCount.unreadCount > 0 && (
                <span className="notification-badge-sidebar">
                  {unreadCount.unreadCount > 99 ? '99+' : unreadCount.unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* 하단 메뉴 */}
          <div className="sidebar-section sidebar-bottom">
            <button
              className={`sidebar-menu-item ${selectedMenu === 'faq' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('faq')}
            >
              <span className="sidebar-icon">❓</span>
              <span className="sidebar-text">FAQ</span>
            </button>
            <button
              className={`sidebar-menu-item ${selectedMenu === 'settings' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-text">설정</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 왼쪽 패널 */}
      {isPanelOpen && selectedMenu && (
        <div className="sidebar-panel">
          <div className="sidebar-panel-header">
            <div className="sidebar-panel-title-wrapper">
              <h3 className="sidebar-panel-title">
                {selectedMenu === 'wallet' && '내 자산'}
                {selectedMenu === 'chatbot' && '자격증'}
                {selectedMenu === 'notification' && '알림'}
                {selectedMenu === 'faq' && 'FAQ'}
                {selectedMenu === 'settings' && '설정'}
              </h3>
              {selectedMenu === 'wallet' && (
                <button
                  className={`wallet-refresh-button ${isRefreshDisabled ? 'disabled' : ''}`}
                  onClick={handleRefresh}
                  disabled={isRefreshDisabled}
                  aria-label="자산 새로고침"
                  title={isRefreshDisabled ? `새로고침은 5분 간격으로 가능합니다 ${Math.floor(refreshCountdown / 60)}분 ${refreshCountdown % 60}초` : '자산 동기화'}
                >
                  <span className="wallet-refresh-icon">🔄</span>
                </button>
              )}
            </div>
            <button
              className="sidebar-panel-close"
              onClick={() => {
                const wasNotificationPanel = selectedMenu === 'notification';
                setIsPanelOpen(false);
                setSelectedMenu(null);
                
                // 알림 패널을 닫을 때 알림 캐시 무효화하여 다음에 열 때 최신 데이터 가져오기
                if (wasNotificationPanel) {
                  queryClient.invalidateQueries({ queryKey: ['notifications', 'infinite'] });
                }
              }}
              aria-label="패널 닫기"
            >
              ×
            </button>
          </div>
          {selectedMenu === 'wallet' && (
            <div className="wallet-summary-cards">
              {isAssetsLoading ? (
                <div className="wallet-loading">로딩 중...</div>
              ) : (
                <>
                  {/* 원화 KRW 카드 */}
                  <div className="wallet-card">
                    <div className="wallet-card-label">원화 KRW</div>
                    <div className="wallet-card-value">
                      {formatCurrency(getTotalKRW(assets))}
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">USDT</span>
                      <span className="wallet-card-value-small">
                        {formatNumber((getUSDTAsset(assets)?.quantity || 0) * (getUSDTAsset(assets)?.avgBuyPrice || 0))}
                      </span>
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">BTC</span>
                      <span className="wallet-card-value-small">
                        {(() => {
                          // 모든 거래소의 BTC 보유 수량 합산
                          const totalBTCQuantity = assets
                            .filter((asset) => asset.symbol === 'BTC')
                            .reduce((total, asset) => total + (asset.quantity || 0), 0);
                          return totalBTCQuantity > 0 ? totalBTCQuantity.toFixed(8) : '0';
                        })()}
                      </span>
                    </div>
                  </div>
                  {/* 총 보유자산 카드 */}
                  {(() => {
                    // 모든 코인 자산의 현재 평가금액 합계 (현재가 * 보유수량)
                    const totalEvaluationAmount = assets
                      .filter((asset) => asset.symbol !== 'KRW')
                      .reduce((total, asset) => {
                        const marketCode = asset.coin?.marketCode;
                        if (!marketCode) return total;
                        const currentPrice = priceData[marketCode]?.tradePrice || 0;
                        return total + (currentPrice * (asset.quantity || 0));
                      }, 0);
                    
                    // KRW 자산 추가 (모든 거래소 합계)
                    const krwValue = getTotalKRW(assets);
                    const totalAssetsValue = krwValue + totalEvaluationAmount;
                    
                    // 총 매수금액 (매수평균가 * 보유수량)
                    const totalBuyAmount = getTotalCoinAssets(assets);
                    const totalBuyAmountWithKRW = krwValue + totalBuyAmount;
                    
                    // 총 평가손익 = 총 평가금액 - 총 매수금액
                    const totalProfitLoss = totalAssetsValue - totalBuyAmountWithKRW;
                    
                    // 총 수익률 = (총 평가금액 - 총 매수금액) / 총 매수금액 * 100
                    const totalProfitRate = totalBuyAmountWithKRW > 0 
                      ? ((totalAssetsValue - totalBuyAmountWithKRW) / totalBuyAmountWithKRW) * 100 
                      : 0;
                    
                    return (
                      <div className="wallet-card">
                        <div className="wallet-card-label">총 보유자산</div>
                        <div className="wallet-card-value-large">
                          {formatCurrency(totalAssetsValue)}
                        </div>
                        <div className="wallet-card-row">
                          <span className="wallet-card-label-small">총 평가손익</span>
                          <span 
                            className="wallet-card-value-small"
                            style={{ color: totalProfitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
                          >
                            {formatNumber(totalProfitLoss)}
                          </span>
                        </div>
                        <div className="wallet-card-row">
                          <span className="wallet-card-label-small">총 수익률</span>
                          <span 
                            className="wallet-card-value-small"
                            style={{ color: totalProfitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
                          >
                            {totalProfitRate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
          <div className="sidebar-panel-content">
            {selectedMenu === 'wallet' && (
              <>
                <div className="wallet-content-title">보유 자산</div>
                {isAssetsLoading ? (
                  <div className="wallet-loading">로딩 중...</div>
                ) : (
                  <>
                    <div className="wallet-summary-rows">
                      <div className="wallet-summary-row">
                        <div className="wallet-summary-vertical-line"></div>
                        <div className="wallet-summary-content">
                          <span className="wallet-card-label-small">총 매수</span>
                          <span className="wallet-card-value-small">
                            {formatCurrency(getTotalCoinAssets(filteredAssets))}
                          </span>
                        </div>
                      </div>
                      <div className="wallet-summary-row">
                        <div className="wallet-summary-vertical-line"></div>
                        <div className="wallet-summary-content">
                          <span className="wallet-card-label-small">총 평가</span>
                          <span 
                            className="wallet-card-value-small"
                            style={{
                              color: (() => {
                                // 모든 코인 자산의 현재 평가금액 합계 (현재가 * 보유수량)
                                const totalEvaluationAmount = filteredAssets
                                  .filter((asset) => asset.symbol !== 'KRW')
                                  .reduce((total, asset) => {
                                    const marketCode = asset.coin?.marketCode;
                                    if (!marketCode) return total;
                                    const currentPrice = priceData[marketCode]?.tradePrice || 0;
                                    return total + (currentPrice * (asset.quantity || 0));
                                  }, 0);
                                
                                // KRW 자산 추가 (선택된 거래소 또는 전체 합계)
                                const krwValue = getTotalKRW(filteredAssets);
                                const totalAssetsValue = krwValue + totalEvaluationAmount;
                                
                                // 총 매수금액
                                const totalBuyAmount = getTotalCoinAssets(filteredAssets);
                                const totalBuyAmountWithKRW = krwValue + totalBuyAmount;
                                
                                // 총 수익률 계산
                                const totalProfitRate = totalBuyAmountWithKRW > 0 
                                  ? ((totalAssetsValue - totalBuyAmountWithKRW) / totalBuyAmountWithKRW) * 100 
                                  : 0;
                                
                                return totalProfitRate >= 0 ? 'var(--price-up)' : 'var(--price-down)';
                              })()
                            }}
                          >
                            {(() => {
                              // 모든 코인 자산의 현재 평가금액 합계 (현재가 * 보유수량)
                              const totalEvaluationAmount = filteredAssets
                                .filter((asset) => asset.symbol !== 'KRW')
                                .reduce((total, asset) => {
                                  const marketCode = asset.coin?.marketCode;
                                  if (!marketCode) return total;
                                  const currentPrice = priceData[marketCode]?.tradePrice || 0;
                                  return total + (currentPrice * (asset.quantity || 0));
                                }, 0);
                              return formatCurrency(totalEvaluationAmount);
                            })()}
                          </span>
                        </div>
                        {/* 거래소 선택 및 정렬 셀렉트 박스 */}
                        <div className="wallet-filter-controls">
                          <div className="wallet-filter-group">
                            <select
                              id="exchange-select"
                              className="wallet-filter-select"
                              value={selectedExchangeCode ?? ''}
                              onChange={(e) => setSelectedExchangeCode(e.target.value ? Number(e.target.value) : null)}
                            >
                              <option value="">거래소 전체</option>
                              {exchangeOptions.map((exchange) => (
                                <option key={exchange.code} value={exchange.code}>
                                  {exchange.koreanName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="wallet-filter-group">
                            <select
                              id="sort-select"
                              className="wallet-filter-select"
                              value={sortOption}
                              onChange={(e) => setSortOption(e.target.value as SortOption)}
                            >
                              <option value="holdings">보유금액순</option>
                              <option value="profit-high">높은수익률</option>
                              <option value="profit-low">낮은수익률</option>
                              <option value="name">가나다순</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <WalletAssetList 
                      assets={filteredAssets} 
                      sortOption={sortOption}
                      selectedExchangeCode={selectedExchangeCode}
                      exchanges={exchangeOptions}
                    />
                  </>
                )}
              </>
            )}
            {selectedMenu === 'chatbot' && (
              <div className="sidebar-panel-placeholder">서비스 준비중...</div>
            )}
            {selectedMenu === 'notification' && <NotificationList />}
            {selectedMenu === 'faq' && (
              <div className="faq-content">
                <div className="faq-section">
                  <h4 className="faq-section-title">자주 묻는 질문</h4>
                  <div className="faq-list">
                    {[
                      {
                        id: 1,
                        question: '비트리버는 어떤 서비스인가요?',
                        answer: (
                          <>
                            비트리버는 <strong>여러 거래소의 자산을 통합 관리</strong>할 수 있는 서비스입니다.
                            <br />
                            <br />
                            -{' '}
                            <Link href="/coins" className="faq-inline-link">
                              마켓
                            </Link>
                            {' '}에서 실제 거래소의 시세와 심리지표를 확인할 수 있습니다.
                            <br />
                            -{' '}
                            <Link href="/diaries" className="faq-inline-link">
                              매매일지
                            </Link>
                            {' '}에서 연동된 거래소의 매매내역을 캘린더에서 확인하고,
                            <br />
                            &nbsp;&nbsp;&nbsp;나만의 매매일지를 작성해보세요.
                            <br />
                            -{' '}
                            <Link href="/communities" className="faq-inline-link">
                              피드
                            </Link>
                            {' '}에서 실시간으로 다른 트레이더들과 소통하고,
                            <br />
                            &nbsp;&nbsp;&nbsp;뉴스 피드를 통해 최신 뉴스를 확인할 수 있습니다.
                            <br />
                            -{' '}
                            <Link href="/asset-analysis" className="faq-inline-link">
                              자산 분석
                            </Link>
                            {' '}에서 연동된 거래소의 통합적인 포트폴리오와
                            <br />
                            &nbsp;&nbsp;&nbsp;다양한 분석자료를 시각화하여 제공합니다.
                          </>
                        ),
                      },
                      {
                        id: 2,
                        question: '거래소 연동은 어떻게 하나요?',
                        answer: (
                          <>
                            <Link href="/mypage/exchanges" className="faq-inline-link">
                              계정 설정 &gt; 거래소 연동
                            </Link>{' '}
                            메뉴에서
                            <br />
                            각 거래소의 API 키를 등록하실 수 있습니다.
                            <br />
                            <br />
                            API 키는 안전하게 암호화되어 저장되며,
                            <br />
                            비트리버는 <strong>입금과 출금 및 거래 권한을 절대 요구하지 않습니다</strong>.
                          </>
                        ),
                      },
                      {
                        id: 3,
                        question: '데이터는 얼마나 자주 업데이트되나요?',
                        answer: (
                          <>
                            <strong>가격 정보</strong>는 실시간 시세를 기반으로 업데이트되며, 10초 마다 갱신됩니다.
                            <br />
                            거래소와의 시간 차에 의해서 미세한 차이가 발생할 수 있음을 알려드리며,
                            <br />
                            정밀한 가격 추적은 거래소 차트를 확인해주세요.
                            <br />
                            <br />
                            <strong>자산 정보</strong>는 로그인 시 자동으로 갱신되며, 자산에 변동이 있을경우
                            <br />
                            내 자산 &gt; 새로고침 버튼을 통해 최신 자산 정보를 확인할 수 있습니다.
                          </>
                        ),
                      },
                      {
                        id: 4,
                        question: '암호화폐를 직접 거래할 수 있나요?',
                        answer: (
                          <>
                            비트리버는 통합형 포트폴리오 정보 제공 서비스로서,
                            <br />
                            암호화폐를 직접 거래할 수 있는 기능은 제공하지 않습니다.
                            <br />                          
                            <br />
                            때문에 API 키를 발급하실 때에도 입금/출금 및 거래 기능을 
                            <br />
                            비활성화 하고 등록해주세요.
                          </>
                        ),
                        
                      },
                      {
                        id: 5,
                        question: '서비스 이용시 비용이 발생하나요?',
                        answer: (
                          <>
                            비트리버는 현재 모든 서비스를 무료로 제공하고 있습니다.
                            <br />
                            향후 고급 분석 지표나 AI 분석 등의 프리미엄 기능이 추가될 수 있습니다.
                          </>
                        ),
                      },{
                        id: 6,
                        question: 'API 키를 등록에 실패하는데 어떻게 해야하나요?',
                        answer: (
                          <>
                            1. 먼저 거래소의 API 키 발급 화면(Upbit, Bithumb, Binance) 에서,
                            <br />
                            &nbsp;&nbsp;&nbsp;비트리버가 제공하는 예시와 동일하게 설정했는지 확인해주세요.
                            <br />
                            <br />
                            2. 거래소의 API 키 발급 후 확인되는 팝업 창을 닫지 마시고,
                            <br />
                            &nbsp;&nbsp;&nbsp;API Key 와 Secret Key 를 복사하여 올바른 위치에 붙여 넣어주세요.
                            <br />
                            <br />
                            3. API Key 와 Secret Key 의 앞/뒤에 공백이 있는지 확인해주세요.
                            <br />
                            <br />
                            4. 위의 경우를 모두 충족하여도 실패하는 경우, 
                            <br />
                            &nbsp;&nbsp;&nbsp;하단의 문의하기로 내용을 남겨주시면 성심성의껏 도와드리겠습니다.
                          </>
                        ),
                      },
                      {
                        id: 7,
                        question: '방금 거래한 내역이 없어요. 언제 연동되나요?',
                        answer: (
                          <>
                            <strong>내 자산 &gt; 새로고침 버튼</strong>을 통해 최신 자산 정보를 가져오거나,
                            <br />
                            <strong>재로그인</strong> 하시면 자동으로 자산 정보와 매매내역이 동기화 됩니다.
                          </>
                        ),
                      },
                      {
                        id: 8,
                        question: '거래한 종목이 매매일지나 마켓에서 보이지 않아요.',
                        answer: (
                          <>
                            최대한 많은 종목을 거래소와 연동하여 지원하고 있지만,
                            <br />
                            일부 지원하지 않는 암호화폐 종목이 있을 수 있습니다.
                            <br />
                            <br />
                            만약 일부 종목에서 오류가 발생한다면,
                            <br />
                            하단의 문의하기로 남겨주시면 감사하겠습니다.
                          </>
                        ),
                      },
                    ].map((faq) => (
                      <div key={faq.id} className={`faq-item ${openFaqId === faq.id ? 'open' : ''}`}>
                        <button
                          className="faq-question"
                          onClick={() => {
                            setOpenFaqId(openFaqId === faq.id ? null : faq.id);
                          }}
                        >
                          <span className="faq-question-text">{faq.question}</span>
                          <span className="faq-arrow">{openFaqId === faq.id ? '▲' : '▼'}</span>
                        </button>
                        {openFaqId === faq.id && (
                          <div className="faq-answer">{faq.answer}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="faq-feedback-section">
                  <h4 className="faq-section-title">문의하기</h4>
                  <form
                    className="faq-feedback-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const content = feedback.trim();
                      if (!content) return;
                      if (!user) {
                        setFeedbackError('문의를 제출하려면 로그인이 필요합니다.');
                        return;
                      }
                      setFeedbackError(null);
                      setFeedbackSubmitting(true);
                      try {
                        await inquiryService.create({ content });
                        setFeedback('');
                        setFeedbackSubmitted(true);
                        setTimeout(() => setFeedbackSubmitted(false), 3000);
                      } catch (err) {
                        setFeedbackError(err instanceof Error ? err.message : '문의 접수에 실패했습니다.');
                      } finally {
                        setFeedbackSubmitting(false);
                      }
                    }}
                  >
                    <textarea
                      className="faq-feedback-textarea"
                      value={feedback}
                      onChange={(e) => {
                        setFeedback(e.target.value);
                        setFeedbackError(null);
                      }}
                      placeholder="개선점이나 문의하실 내용이 있다면 자유롭게 작성 부탁드립니다."
                      rows={4}
                      disabled={feedbackSubmitting}
                    />
                    {feedbackError && (
                      <div className="faq-feedback-error" role="alert">
                        {feedbackError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="faq-feedback-submit"
                      disabled={feedbackSubmitting || !feedback.trim()}
                    >
                      {feedbackSubmitting ? '제출 중...' : '문의 제출'}
                    </button>
                    {feedbackSubmitted && (
                      <div className="faq-feedback-thanks">
                        의견을 보내주셔서 감사합니다.
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
            {selectedMenu === 'settings' && (
              <div className="settings-theme-toggle-wrapper">
                <div className="settings-theme-row">
                  <span className="settings-theme-label">다크 모드</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    aria-label={theme === 'dark' ? '다크 모드 사용 중' : '라이트 모드 사용 중'}
                    onClick={() => {
                      const next = theme === 'light' ? 'dark' : 'light';
                      if (typeof window !== 'undefined') localStorage.setItem('theme', next);
                      dispatch(toggleTheme());
                    }}
                    className={`settings-theme-switch ${theme === 'dark' ? 'is-dark' : ''}`}
                  >
                    <span className="settings-theme-switch-track">
                      <span className="settings-theme-switch-thumb" />
                    </span>
                  </button>
                </div>
                <p className="settings-theme-hint">
                  {theme === 'light' ? '밝은 화면으로 보기' : '어두운 화면으로 보기'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
