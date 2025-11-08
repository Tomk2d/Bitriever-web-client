'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // 캘린더 페이지(매매 일지)에서는 footer 숨기기
  if (pathname === '/diaries') {
    return null;
  }
  
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="text-center text-sm text-gray-600">
          © 2025 Bitriever. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

