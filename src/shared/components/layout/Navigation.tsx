'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { clearUser } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/services/authService';
import './Navigation.css';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { label: '내 정보', path: '/profile' },
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
      dispatch(clearUser());
      setIsDropdownOpen(false);
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      // 에러가 발생해도 로컬 상태는 클리어
      dispatch(clearUser());
      setIsDropdownOpen(false);
      router.push('/login');
    }
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    router.push('/profile');
  };

  const getInitials = (nickname: string | null) => {
    if (!nickname) return '?';
    return nickname.charAt(0).toUpperCase();
  };

  return (
    <nav className="navigation">
      <div className="navigation-container">
        <div className="navigation-content">
          <div className="navigation-left">
            {/* 로고 섹션 */}
            <div className="navigation-logo">
              <img 
                src="/assets/images/logos/window.svg" 
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
                  <div className="profile-avatar">
                    {getInitials(user.nickname)}
                  </div>
                </button>
                {isDropdownOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getInitials(user.nickname)}
                      </div>
                      <div className="profile-dropdown-info">
                        <div className="profile-dropdown-name">{user.nickname}</div>
                        <div className="profile-dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="profile-dropdown-divider"></div>
                    <button
                      type="button"
                      onClick={handleSettings}
                      className="profile-dropdown-item"
                    >
                      설정
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

