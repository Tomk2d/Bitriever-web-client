'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearUser, setUser } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/services/authService';
import NewsHeadlineRotator from './NewsHeadlineRotator';
import './Navigation.css';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const theme = useAppSelector((state) => state.ui.theme);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 앱 초기화 시 localStorage의 토큰 확인 및 사용자 정보 가져오기
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialized) return;
      
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // 토큰이 없으면 초기화만 완료
      if (!accessToken) {
        setIsInitialized(true);
        return;
      }
      
      // 토큰이 있고 인증되지 않은 상태일 때만 API 호출
      if (!isAuthenticated) {
        try {
          const userData = await authService.getCurrentUser();
          dispatch(setUser({
            userId: userData.id,
            email: userData.email,
            nickname: userData.nickname,
            profileUrl: userData.profileUrl || '/profile1',
            connectedExchanges: userData.connectedExchanges || [],
          }));
        } catch (error) {
          // 에러 발생 시 조용히 처리 (로그인되지 않은 상태로 유지)
          // 토큰이 유효하지 않으면 제거
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
          }
          dispatch(clearUser());
        }
      }
      
      setIsInitialized(true);
    };

    initializeAuth();
  }, [dispatch, isAuthenticated, isInitialized]);

  // 테마 변경 시 html에 클래스 적용
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const navItems = [
    { label: '홈', path: '/dashboard' },
    { label: '마켓', path: '/coins' },
    { label: '매매일지', path: '/diaries' },
    { label: '피드', path: '/communities' },
    { label: '자산 분석', path: '/asset-analysis' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      // authService.logout() 내부에서 Redux와 React Query 캐시를 이미 클리어함
      setIsDropdownOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 에러가 발생해도 로컬 상태는 클리어
      // authService.logout()이 실패했을 수도 있으므로 직접 클리어
      dispatch(clearUser());
      // React Query 캐시도 클리어
      queryClient.clear();
      setIsDropdownOpen(false);
      router.push('/login');
    }
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    router.push('/mypage');
  };

  const getInitials = (nickname: string | null) => {
    if (!nickname) return '?';
    return nickname.charAt(0).toUpperCase();
  };

  const getProfileImageUrl = (profileUrl: string | null) => {
    if (!profileUrl) return '/profile/profile1.png';
    return `/profile${profileUrl}.png`;
  };

  return (
    <nav className="navigation">
      <div className="navigation-container">
        <div className="navigation-content">
          <div className="navigation-left">
            {/* 로고 섹션 */}
            <div className="navigation-logo">
              <img 
                src="/data/main-logo-ex.png" 
                alt="Bitriever Logo" 
                className="logo-image"
              />
              <div className="logo-text">
                <span className="logo-brand">Bitriever</span>
              </div>
            </div>

            {/* 메인 네비게이션 메뉴 */}
            <div className="navigation-menu">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 오른쪽 섹션 (검색바 + 로그인) */}
          <div className="navigation-right">
            <NewsHeadlineRotator />
            <div className="navigation-search">
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                className="search-input"
              />
            </div>
            {isAuthenticated && user ? (
              <div className="profile-menu-container" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="profile-button"
                  aria-label="프로필 메뉴"
                >
                  <span 
                    className="profile-avatar-image"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '20px',
                      filter: 'grayscale(100%)',
                      opacity: 0.6
                    }}
                  >
                    👤
                  </span>
                </button>
                {isDropdownOpen && (
                  <div className="profile-dropdown">
                    <button
                      type="button"
                      onClick={handleSettings}
                      className="profile-dropdown-item"
                    >
                      계정 설정
                    </button>
              <button
                type="button"
                onClick={handleLogout}
                      className="profile-dropdown-item profile-dropdown-item-danger"
              >
                      로그아웃
              </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="login-button"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

