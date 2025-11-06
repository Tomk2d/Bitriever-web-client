'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './MonthlyCalendar.css';
import { useTradingHistories } from '@/features/trading/hooks/useTradingHistories';
import { getDateKey } from '@/shared/utils/dateUtils';
import type { TradingHistoryResponse } from '@/features/trading/services/tradingHistoryService';

export default function MonthlyCalendar() {
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const [value, setValue] = useState<Date>(today);
  const [activeStartDate, setActiveStartDate] = useState<Date | null>(today);
  const calendarRef = useRef<HTMLDivElement>(null);

  const { data: tradingHistories = [], isLoading, error } = useTradingHistories(activeStartDate);

  useEffect(() => {
    console.log('[MonthlyCalendar] Trading histories state:', {
      count: tradingHistories.length,
      isLoading,
      hasError: !!error,
      activeStartDate: activeStartDate?.toISOString(),
    });
  }, [tradingHistories, isLoading, error, activeStartDate]);

  const handleChange = (val: any) => {
    if (val instanceof Date) {
      const date = new Date(val);
      date.setHours(0, 0, 0, 0);
      setValue(date);
    }
  };

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      setActiveStartDate(activeStartDate);
    }
  };

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

  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') {
      return null;
    }

    const dateKey = getDateKey(date);
    const histories = tradingHistoriesByDate[dateKey] || [];

    if (histories.length === 0) {
      return null;
    }

    // 첫 번째 거래만 선택
    const firstHistory = histories[0];
    const coin = firstHistory.coin;
    const coinSymbol = coin?.symbol || `코인 ${firstHistory.coinId}`;
    const isBuy = firstHistory.tradeType === 0;
    const remainingCount = histories.length - 1;

    return (
      <div className="calendar-event-indicator">
        <div className="event-content">
          <div className={`event-coin-block ${isBuy ? 'event-buy' : 'event-sell'}`}>
            <span className="event-coin-name">{coinSymbol}</span>
          </div>
          {remainingCount > 0 && (
            <div className="event-remaining-count">
              외 {remainingCount}개의 거래
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
  );
}
