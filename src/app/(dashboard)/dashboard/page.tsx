'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleTheme } from '@/store/slices/uiSlice';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">대시보드</h2>
      
      {/* 임시 테마 반전 버튼 */}
      <div className="mb-4">
        <button
          onClick={handleToggleTheme}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          테마 전환 ({theme === 'light' ? '라이트' : '다크'})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 대시보드 위젯 */}
      </div>
    </div>
  );
}

