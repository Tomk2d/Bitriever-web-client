'use client';

import { useEffect } from 'react';

/**
 * 캘린더 라이브러리를 미리 로드하여 매매일지 페이지 진입 시 렌더링 속도를 향상시킵니다.
 */
export default function CalendarPreloader() {
  useEffect(() => {
    // 캘린더 라이브러리를 미리 로드
    const preloadCalendar = async () => {
      try {
        // react-calendar JS를 미리 로드 (CSS는 매매일지 페이지 진입 시 MonthlyCalendar에서 로드됨)
        await import('react-calendar');
      } catch (error) {
        // 에러는 조용히 처리 (이미 로드되었을 수 있음)
        console.debug('Calendar preload:', error);
      }
    };

    // 앱 초기화 시 즉시 백그라운드에서 로드
    // 사용자가 매매일지 페이지로 이동할 때 이미 준비되어 있음
    preloadCalendar();
  }, []);

  return null; // UI는 렌더링하지 않음
}
