'use client';

import { useEffect } from 'react';
import MypageSidebar from '@/shared/components/mypage/MypageSidebar';
import './mypage.css';

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // 마이페이지 진입 시 좌측 사이드바 너비 설정
    document.documentElement.style.setProperty('--left-sidebar-width', '200px');
    
    return () => {
      // 마이페이지 벗어날 때 좌측 사이드바 너비 초기화
      document.documentElement.style.setProperty('--left-sidebar-width', '0px');
    };
  }, []);

  return (
    <div className="mypage-layout">
      <MypageSidebar />
      <main className="mypage-content">
        {children}
      </main>
    </div>
  );
}
