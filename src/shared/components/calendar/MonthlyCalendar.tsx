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
  const [view, setView] = useState<'month' | 'year' | 'decade' | 'century'>('month');
  const [previousActiveStartDate, setPreviousActiveStartDate] = useState<Date | null>(today);
  const [isMonthClickFromYearView, setIsMonthClickFromYearView] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // 외부에서 전달된 activeStartDate가 있으면 사용, 없으면 내부 상태 사용
  const activeStartDate = externalActiveStartDate !== undefined ? externalActiveStartDate : internalActiveStartDate;

  // 데이터 로딩과 관계없이 캘린더는 먼저 렌더링
  const { data: tradingHistories = [], isLoading, error } = useTradingHistories(activeStartDate);

  // 데이터가 없어도 빈 객체로 초기화하여 캘린더가 정상 렌더링되도록 함
  const tradingHistoriesByDate = useMemo(() => {
    const grouped: Record<string, TradingHistoryResponse[]> = {};
    
    // 데이터가 로드된 경우에만 그룹화
    if (tradingHistories.length > 0) {
      tradingHistories.forEach((history) => {
        const tradeDate = new Date(history.tradeTime);
        const dateKey = getDateKey(tradeDate);
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(history);
      });
    }

    return grouped;
  }, [tradingHistories]);

  const handleChange = (val: any) => {
    if (val instanceof Date) {
      const date = new Date(val);
      date.setHours(0, 0, 0, 0);
      setValue(date);
      
      // 년 뷰에서 월을 클릭한 경우 해당 월로 이동 (onClickMonth에서 이미 처리됨)
      // 여기서는 플래그만 리셋
      if (isMonthClickFromYearView) {
        setIsMonthClickFromYearView(false);
      }
      
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
      // 월/년도가 변경되면 사이드바 닫기
      setSelectedDate(null);
      
      if (onActiveStartDateChange) {
        onActiveStartDateChange(activeStartDate);
      } else {
        setInternalActiveStartDate(activeStartDate);
      }
    }
  };

  // 뷰 변경 핸들러: month -> year -> month 순환
  const handleViewChange = ({ view: newView }: { view: 'month' | 'year' | 'decade' | 'century' }) => {
    // month에서 year로 전환하기 전에 현재 activeStartDate 저장
    if (newView === 'year' && view === 'month') {
      // 현재 activeStartDate를 저장
      if (activeStartDate) {
        setPreviousActiveStartDate(activeStartDate);
      }
      setIsMonthClickFromYearView(false);
      setView('year');
    } 
    // year에서 month로 돌아갈 때
    else if (newView === 'month' && view === 'year') {
      setView('month');
      // 월 버튼을 클릭한 경우가 아니라면 (라벨 클릭) 이전 activeStartDate로 복원
      // isMonthClickFromYearView가 true이면 onClickMonth에서 이미 activeStartDate를 설정했으므로 복원하지 않음
      if (!isMonthClickFromYearView) {
        // 이전 activeStartDate로 복원 (약간의 지연을 두어 react-calendar가 뷰를 먼저 변경하도록)
        setTimeout(() => {
          // 다시 한번 확인 (onClickMonth가 실행되었을 수 있음)
          if (!isMonthClickFromYearView && previousActiveStartDate) {
            if (onActiveStartDateChange) {
              onActiveStartDateChange(previousActiveStartDate);
            } else {
              setInternalActiveStartDate(previousActiveStartDate);
            }
          }
        }, 0);
      }
      // isMonthClickFromYearView가 true인 경우는 onClickMonth에서 이미 처리했으므로 아무것도 하지 않음
    }
    // 현재 뷰가 year이고 decade나 century로 가려고 하면 month로 돌아감
    else if (view === 'year' && (newView === 'decade' || newView === 'century')) {
      setView('month');
      // 이전 activeStartDate로 복원
      setTimeout(() => {
        if (previousActiveStartDate) {
          if (onActiveStartDateChange) {
            onActiveStartDateChange(previousActiveStartDate);
          } else {
            setInternalActiveStartDate(previousActiveStartDate);
          }
        }
      }, 0);
    } 
    // decade나 century로 가면 다시 month로 돌아감
    else if (newView === 'decade' || newView === 'century') {
      setView('month');
      // 이전 activeStartDate로 복원
      setTimeout(() => {
        if (previousActiveStartDate) {
          if (onActiveStartDateChange) {
            onActiveStartDateChange(previousActiveStartDate);
          } else {
            setInternalActiveStartDate(previousActiveStartDate);
          }
        }
      }, 0);
    }
    // 그 외의 경우는 그대로 적용
    else {
      setView(newView);
    }
  };

  // 현재 표시 중인 월이 아닌 날짜인지 확인 (이전 달 또는 다음 달)
  const isOtherMonth = useCallback((date: Date): boolean => {
    if (!activeStartDate) return false;
    const currentMonth = activeStartDate.getMonth();
    const currentYear = activeStartDate.getFullYear();
    const dateMonth = date.getMonth();
    const dateYear = date.getFullYear();
    
    // 다른 년도이거나 다른 월인 경우
    if (dateYear !== currentYear) return true;
    if (dateMonth !== currentMonth) return true;
    return false;
  }, [activeStartDate]);

  // 이전 달 또는 다음 달 날짜 비활성화
  const tileDisabled = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') {
      return false;
    }
    return isOtherMonth(date);
  }, [isOtherMonth]);

  // 데이터 로딩 여부와 관계없이 캘린더 타일은 렌더링
  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') {
      return null;
    }

    // 이전 달 또는 다음 달 날짜는 내용을 표시하지 않음
    if (isOtherMonth(date)) {
      return null;
    }

    // 데이터가 로딩 중이거나 없으면 빈 상태로 반환 (캘린더는 정상 렌더링)
    if (isLoading) {
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
  }, [tradingHistoriesByDate, isLoading, isOtherMonth]);

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
          activeStartDate={activeStartDate || undefined}
          onActiveStartDateChange={handleActiveStartDateChange}
          tileContent={tileContent}
          tileDisabled={tileDisabled}
          view={view}
          onViewChange={handleViewChange}
          onClickMonth={(value, event) => {
            // 년 뷰에서 월을 클릭한 경우 해당 월로 직접 이동
            if (value instanceof Date) {
              const monthStartDate = new Date(value.getFullYear(), value.getMonth(), 1);
              setIsMonthClickFromYearView(true);
              // activeStartDate를 즉시 설정 (handleViewChange의 setTimeout보다 먼저 실행되도록)
              // 약간의 지연을 두어 react-calendar의 내부 상태 업데이트 후에 설정
              setTimeout(() => {
                if (onActiveStartDateChange) {
                  onActiveStartDateChange(monthStartDate);
                } else {
                  setInternalActiveStartDate(monthStartDate);
                }
              }, 10);
            }
          }}
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
