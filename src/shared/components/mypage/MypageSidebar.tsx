'use client';

import { usePathname, useRouter } from 'next/navigation';
import './MypageSidebar.css';

interface MenuItem {
  label: string;
  path: string;
}

export default function MypageSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems: MenuItem[] = [
    { label: '프로필', path: '/mypage' },
    { label: '내가 쓴 피드', path: '/mypage/posts' },
    { label: '거래소 연동', path: '/mypage/exchanges' },
  ];

  const isActive = (path: string) => {
    if (path === '/mypage') {
      return pathname === '/mypage';
    }
    return pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside className="mypage-sidebar">
      <nav className="mypage-sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => handleNavigation(item.path)}
            className={`mypage-sidebar-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="mypage-sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
