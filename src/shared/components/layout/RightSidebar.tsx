'use client';

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
            {selectedMenu === 'faq' && <div>FAQ 컨텐츠</div>}
            {selectedMenu === 'settings' && (
              <div>
                <div>설정 컨텐츠</div>
                <div className="settings-theme-toggle-wrapper">
                  <button
                    onClick={() => dispatch(toggleTheme())}
                    className="settings-theme-toggle-button"
                  >
                    테마 전환 ({theme === 'light' ? '라이트' : '다크'})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
