'use client';

import { useState, useEffect, useRef } from 'react';
import { useAssets } from '@/features/asset/hooks/useAssets';
import { assetService } from '@/features/asset/services/assetService';
import {
  getKRWAsset,
  getTotalCoinAssets,
  getTotalAssets,
  formatCurrency,
  formatNumber,
} from '@/features/asset/utils/assetCalculations';
import WalletAssetList from './WalletAssetList';
import './RightSidebar.css';

type MenuType = 'wallet' | 'watchlist' | 'chatbot' | 'faq' | 'settings' | null;

export default function RightSidebar() {
  const [selectedMenu, setSelectedMenu] = useState<MenuType>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 자산 데이터 가져오기 (wallet 메뉴 선택 시에만 활성화)
  const shouldFetchAssets = selectedMenu === 'wallet' && isPanelOpen;
  const { data: assets = [], isLoading: isAssetsLoading, refetch } = useAssets(shouldFetchAssets);

  const handleMenuClick = (menu: MenuType) => {
    if (selectedMenu === menu && isPanelOpen) {
      // 같은 메뉴를 클릭하면 패널 닫기
      setIsPanelOpen(false);
      setSelectedMenu(null);
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
              className={`sidebar-menu-item ${selectedMenu === 'watchlist' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('watchlist')}
            >
              <span className="sidebar-icon">❤️</span>
              <span className="sidebar-text">관심</span>
            </button>
            <button
              className={`sidebar-menu-item ${selectedMenu === 'chatbot' && isPanelOpen ? 'active' : ''}`}
              onClick={() => handleMenuClick('chatbot')}
            >
              <span className="sidebar-icon">📜</span>
              <span className="sidebar-text">자격증</span>
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
                {selectedMenu === 'watchlist' && '관심'}
                {selectedMenu === 'chatbot' && '자격증'}
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
                setIsPanelOpen(false);
                setSelectedMenu(null);
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
                      {formatCurrency(getKRWAsset(assets)?.quantity || 0)}
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">총 매수</span>
                      <span className="wallet-card-value-small">
                        {formatCurrency(getTotalCoinAssets(assets))}
                      </span>
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">총 평가</span>
                      <span className="wallet-card-value-small">
                        {formatCurrency(getTotalCoinAssets(assets))}
                      </span>
                    </div>
                  </div>
                  {/* 총 보유자산 카드 */}
                  <div className="wallet-card">
                    <div className="wallet-card-label">총 보유자산</div>
                    <div className="wallet-card-value-large">
                      {formatCurrency(getTotalAssets(assets))}
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">평가손익</span>
                      <span className="wallet-card-value-small profit">
                        {formatCurrency(getTotalAssets(assets))}
                      </span>
                    </div>
                    <div className="wallet-card-row">
                      <span className="wallet-card-label-small">수익률</span>
                      <span className="wallet-card-value-small profit">0%</span>
                    </div>
                  </div>
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
                  <WalletAssetList assets={assets} />
                )}
              </>
            )}
            {selectedMenu === 'watchlist' && <div>관심 컨텐츠</div>}
            {selectedMenu === 'chatbot' && <div>자격증 컨텐츠</div>}
            {selectedMenu === 'faq' && <div>FAQ 컨텐츠</div>}
            {selectedMenu === 'settings' && <div>설정 컨텐츠</div>}
          </div>
        </div>
      )}
    </>
  );
}
