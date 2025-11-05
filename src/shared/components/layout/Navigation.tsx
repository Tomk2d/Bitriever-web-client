'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import './Navigation.css';

export default function Navigation() {
  const pathname = usePathname();
  const theme = useAppSelector((state) => state.ui.theme);

  // 테마 변경 시 html에 클래스 적용
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

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
            <Link href="/login" className="login-button">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

