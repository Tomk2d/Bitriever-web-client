'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './MonthlyCalendar.css';
import { useTradingHistories } from '@/features/trading/hooks/useTradingHistories';
import { getDateKey } from '@/shared/utils/dateUtils';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';
import TradingHistorySidebar from './TradingHistorySidebar';

interface MonthlyCalendarProps {
  activeStartDate?: Date | null;
  onActiveStartDateChange?: (activeStartDate: Date | null) => void;
}

export default function MonthlyCalendar({ 
  activeStartDate: externalActiveStartDate,
  onActiveStartDateChange 
}: MonthlyCalendarProps = {}) {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [value, setValue] = useState<Date>(today);
  const [internalActiveStartDate, setInternalActiveStartDate] = useState<Date | null>(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // 외부에서 전달된 activeStartDate가 있으면 사용, 없으면 내부 상태 사용
  const activeStartDate = externalActiveStartDate !== undefined ? externalActiveStartDate : internalActiveStartDate;

  const { data: tradingHistories = [], isLoading, error } = useTradingHistories(activeStartDate);

  useEffect(() => {
    console.log('[MonthlyCalendar] Trading histories state:', {
      count: tradingHistories.length,
      isLoading,
      hasError: !!error,
      activeStartDate: activeStartDate?.toISOString(),
    });
  }, [tradingHistories, isLoading, error, activeStartDate]);

  const tradingHistoriesByDate = useMemo(() => {
    const grouped: Record<string, TradingHistoryResponse[]> = {};
    
    tradingHistories.forEach((history) => {
      const tradeDate = new Date(history.tradeTime);
      const dateKey = getDateKey(tradeDate);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(history);
    });

    return grouped;
  }, [tradingHistories]);

  const handleChange = (val: any) => {
    if (val instanceof Date) {
      const date = new Date(val);
      date.setHours(0, 0, 0, 0);
      setValue(date);
      
      // 날짜 클릭 시 선택된 날짜 설정 (거래 내역이 없어도 패널 열기)
      setSelectedDate(date);
    }
  };
  
  const handleCloseSidebar = () => {
    setSelectedDate(null);
  };
  
  // 선택된 날짜의 매매 기록 필터링
  const selectedDateHistories = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    const dateKey = getDateKey(selectedDate);
    return tradingHistoriesByDate[dateKey] || [];
  }, [selectedDate, tradingHistoriesByDate]);

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      if (onActiveStartDateChange) {
        onActiveStartDateChange(activeStartDate);
      } else {
        setInternalActiveStartDate(activeStartDate);
      }
    }
  };

  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') {
      return null;
    }

    const dateKey = getDateKey(date);
    const histories = tradingHistoriesByDate[dateKey] || [];

    if (histories.length === 0) {
      return null;
    }

    // 이미지 URL 구성 (public 폴더는 루트 경로로 제공됨)
    const imageBasePath = process.env.NEXT_PUBLIC_IMAGE_BASE_PATH || '';
    
    // 최대 3개까지 이미지 표시
    const maxImages = 3;
    const displayHistories = histories.slice(0, maxImages);
    const remainingCount = histories.length - maxImages;

    return (
      <div className="calendar-event-indicator">
        <div className="event-content">
          <div className="event-coin-images">
            {displayHistories.map((history, index) => {
              const coin = history.coin;
              const imageUrl = coin?.imgUrl ? `${imageBasePath}${coin.imgUrl}` : null;
              const isBuy = history.tradeType === 0;
              
              return (
                <img
                  key={`${history.id}-${index}`}
                  src={imageUrl || ''}
                  alt={coin?.symbol || `코인 ${history.coinId}`}
                  className={`event-coin-image ${isBuy ? 'event-buy' : 'event-sell'}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              );
            })}
          </div>
          {remainingCount > 0 && (
            <div className="event-remaining-count">
              + {remainingCount}개의 거래
            </div>
          )}
        </div>
      </div>
    );
  }, [tradingHistoriesByDate]);

  useEffect(() => {
    if (!calendarRef.current) return;

    const calendarElement = calendarRef.current.querySelector('.react-calendar');
    if (!calendarElement) return;

    // 1. 네비게이션 버튼들을 감싸는 div 생성
    const navigation = calendarElement.querySelector('.react-calendar__navigation');
    if (navigation && !navigation.querySelector('.navigation-wrapper')) {
      const navWrapper = document.createElement('div');
      navWrapper.className = 'navigation-wrapper';
      
      // 모든 네비게이션 버튼들을 찾아서 wrapper로 이동
      const navButtons = Array.from(navigation.querySelectorAll('button'));
      navButtons.forEach((button) => {
        navWrapper.appendChild(button);
      });
      
      navigation.appendChild(navWrapper);
    }

    // 2. 요일들을 감싸는 div 생성
    const weekdays = calendarElement.querySelector('.react-calendar__month-view__weekdays');
    if (weekdays && !weekdays.querySelector('.weekdays-wrapper')) {
      const weekdaysWrapper = document.createElement('div');
      weekdaysWrapper.className = 'weekdays-wrapper';
      
      // 모든 요일 요소들을 찾아서 wrapper로 이동
      const weekdayElements = Array.from(weekdays.querySelectorAll('.react-calendar__month-view__weekdays__weekday'));
      weekdayElements.forEach((weekday) => {
        weekdaysWrapper.appendChild(weekday);
      });
      
      weekdays.appendChild(weekdaysWrapper);
    }

    // 3. 날짜 그리드와 함께 묶기
    const daysGrid = calendarElement.querySelector('.react-calendar__month-view__days');
    const monthView = calendarElement.querySelector('.react-calendar__month-view');
    if (monthView && daysGrid && !monthView.querySelector('.calendar-content-wrapper')) {
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'calendar-content-wrapper';
      
      // 요일과 날짜 그리드를 contentWrapper로 이동
      if (weekdays) {
        contentWrapper.appendChild(weekdays);
      }
      if (daysGrid) {
        contentWrapper.appendChild(daysGrid);
      }
      
      monthView.appendChild(contentWrapper);
    }
  }, [value]); // value가 변경될 때마다 실행 (월 변경 시)

  return (
    <>
    <div className="monthly-calendar">
      <div className="calendar-wrapper" ref={calendarRef}>
        <Calendar
          onChange={handleChange}
          value={value}
          className="diary-calendar"
          locale="ko-KR"
          formatDay={(locale, date) => date.getDate().toString()}
          defaultActiveStartDate={today}
            onActiveStartDateChange={handleActiveStartDateChange}
            tileContent={tileContent}
        />
      </div>
    </div>
      <TradingHistorySidebar
        selectedDate={selectedDate}
        tradingHistories={selectedDateHistories}
        onClose={handleCloseSidebar}
      />
    </>
  );
}
