'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useEconomicEventsPrefetch, useEconomicEventsByMonth } from '@/features/economicEvent/hooks/useEconomicEventsByMonth';
import { EconomicEventResponse } from '@/features/economicEvent/types';
import { getDateKey } from '@/shared/utils/dateUtils';
import './EconomicCalendarSidebar.css';

interface EconomicCalendarSidebarProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
}

const formatYearMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function EconomicCalendarSidebar({ 
  isOpen, 
  isClosing = false, 
  onClose 
}: EconomicCalendarSidebarProps) {
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);
  
  // 현재 월 상태 관리
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1); // 월의 첫 날로 설정
    return date;
  });
  
  // 현재월부터 +2개월까지 prefetch
  useEconomicEventsPrefetch();
  
  // 오늘 날짜 확인
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // 선택된 월의 데이터 가져오기
  const currentYearMonth = formatYearMonth(currentMonth);
  const { data: currentMonthEvents = [] } = useEconomicEventsByMonth(currentYearMonth);

  // 선택된 월의 이벤트 사용
  const allEvents = useMemo(() => {
    return currentMonthEvents;
  }, [currentMonthEvents]);

  // 날짜별로 이벤트 그룹화
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EconomicEventResponse[]> = {};
    
    allEvents.forEach((event) => {
      const eventDate = new Date(event.eventDate);
      const dateKey = getDateKey(eventDate);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    // 날짜순으로 정렬
    return grouped;
  }, [allEvents]);

  // 날짜별로 정렬된 이벤트 목록 (그룹화)
  const groupedEvents = useMemo(() => {
    const sortedDates = Object.keys(eventsByDate).sort();
    const todayKey = getDateKey(today);
    
    // 오늘 날짜에 이벤트가 없어도 포함시키기
    const events = sortedDates.map((dateKey) => ({
      date: dateKey,
      events: eventsByDate[dateKey],
    }));
    
    // 오늘 날짜가 없고 현재 월이 오늘 날짜의 월과 같으면 빈 이벤트 배열로 추가
    if (!eventsByDate[todayKey] && currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()) {
      const todayIndex = events.findIndex(({ date }) => date > todayKey);
      if (todayIndex >= 0) {
        events.splice(todayIndex, 0, { date: todayKey, events: [] });
      } else {
        events.push({ date: todayKey, events: [] });
      }
    }
    
    return events;
  }, [eventsByDate, today, currentMonth]);

  // 날짜와 요일 포맷팅
  const formatDateAndWeekday = (dateString: string): React.ReactElement => {
    const date = new Date(dateString);
    const day = date.getDate();
    const weekday = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return (
      <>
        <span className="economic-calendar-date-day">{day}</span>
        <span className="economic-calendar-date-weekday"> {weekday}</span>
      </>
    );
  };

  // 날짜가 과거인지 미래인지 확인
  const isPastDate = (dateString: string): boolean => {
    const eventDate = new Date(dateString);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // 값 포맷팅
  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value.toString();
  };

  // 시간 포맷팅 (오전/오후 형식)
  const formatTime = (timeString: string | null): string => {
    if (!timeString) return '';
    
    // "HH:mm:ss" 또는 "HH:mm" 형식 처리
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString;
    
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    
    if (isNaN(hours)) return timeString;
    
    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    
    return `${period} ${displayHours}:${minutes} 발표`;
  };

  const { isLoading } = useEconomicEventsByMonth(currentYearMonth);

  // 오늘 날짜로 스크롤 (초기 열 때 또는 월 변경 시 한 번만)
  useEffect(() => {
    if (isOpen && !isLoading && groupedEvents.length > 0 && sidebarBodyRef.current && !hasScrolledRef.current) {
      const todayKey = getDateKey(today);
      
      // 오늘 날짜 그룹 찾기
      const todayGroupIndex = groupedEvents.findIndex(({ date }) => date === todayKey);
      
      if (todayGroupIndex >= 0) {
        // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 스크롤
        setTimeout(() => {
          const dateGroups = sidebarBodyRef.current?.querySelectorAll('.economic-calendar-date-group');
          if (dateGroups && dateGroups[todayGroupIndex]) {
            const targetElement = dateGroups[todayGroupIndex] as HTMLElement;
            const headerHeight = sidebarBodyRef.current?.querySelector('.economic-calendar-events-header')?.clientHeight || 0;
            const scrollPosition = targetElement.offsetTop - headerHeight - 80; // 추가 여유 공간
            
            sidebarBodyRef.current?.scrollTo({
              top: scrollPosition,
              behavior: 'smooth',
            });
            
            hasScrolledRef.current = true;
          }
        }, 100);
      } else {
        // 오늘 날짜가 없으면 맨 위로 스크롤
        setTimeout(() => {
          sidebarBodyRef.current?.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
          hasScrolledRef.current = true;
        }, 100);
      }
    }
    
    // 사이드바가 닫히면 플래그 리셋
    if (!isOpen) {
      hasScrolledRef.current = false;
    }
  }, [isOpen, isLoading, groupedEvents, currentMonth]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className={`economic-calendar-sidebar ${isClosing ? 'closing' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="economic-calendar-sidebar-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="economic-calendar-sidebar-header">
            <div className="economic-calendar-sidebar-title-wrapper">
              <button
                className="economic-calendar-month-nav-button"
                onClick={() => {
                  const prevMonth = new Date(currentMonth);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  // 2026년 1월 이전으로는 이동 불가
                  if (prevMonth.getFullYear() >= 2026 && (prevMonth.getFullYear() > 2026 || prevMonth.getMonth() >= 0)) {
                    setCurrentMonth(prevMonth);
                    hasScrolledRef.current = false;
                  }
                }}
                disabled={currentMonth.getFullYear() === 2026 && currentMonth.getMonth() === 0}
                aria-label="이전 달"
              >
                ←
              </button>
              <h3 className="economic-calendar-sidebar-title">
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </h3>
              <button
                className="economic-calendar-month-nav-button"
                onClick={() => {
                  const nextMonth = new Date(currentMonth);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setCurrentMonth(nextMonth);
                  hasScrolledRef.current = false;
                }}
                aria-label="다음 달"
              >
                →
              </button>
            </div>
            <button
              className="economic-calendar-sidebar-close"
              onClick={onClose}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          
          <div className="economic-calendar-sidebar-body" ref={sidebarBodyRef}>
            {isLoading ? (
              <div className="economic-calendar-loading">로딩 중...</div>
            ) : groupedEvents.length === 0 ? (
              <div className="economic-calendar-empty">예정된 경제 이벤트가 없습니다.</div>
            ) : (
              <div className="economic-calendar-events-grid">
                <div className="economic-calendar-events-header">
                  <div className="economic-calendar-header-cell date"></div>
                  <div className="economic-calendar-header-cell event-name"></div>
                  <div className="economic-calendar-header-cell">발표값</div>
                  <div className="economic-calendar-header-cell">예측값</div>
                  <div className="economic-calendar-header-cell">이전값</div>
                </div>
                {groupedEvents.map(({ date, events }) => (
                  <div key={date} className="economic-calendar-date-group">
                    {events.length === 0 ? (
                      // 오늘 날짜에 이벤트가 없는 경우
                      <div className="economic-calendar-event-row">
                        <div className={`economic-calendar-event-cell date ${date === getDateKey(today) ? 'today' : ''}`}>
                          {formatDateAndWeekday(date)}
                        </div>
                        <div className="economic-calendar-event-cell event-name" style={{ gridColumn: 'span 4' }}>
                          이벤트가 없습니다
                        </div>
                      </div>
                    ) : (
                      events.map((event, eventIndex) => {
                        const isPast = isPastDate(date);
                        const value = event.economicEventValue;
                        
                        const actualValue = isPast 
                          ? (value?.actual !== null && value?.actual !== undefined ? formatValue(value.actual) : '-')
                          : (value?.actual !== null && value?.actual !== undefined ? formatValue(value.actual) : (value?.time ? formatTime(value.time) : '-'));
                        
                        const forecastValue = value?.forecast !== null && value?.forecast !== undefined 
                          ? formatValue(value.forecast) 
                          : '-';
                        
                        const historicalValue = value?.historical !== null && value?.historical !== undefined 
                          ? formatValue(value.historical) 
                          : '-';
                        
                        const isToday = date === getDateKey(today);
                        
                        return (
                          <div key={event.id} className="economic-calendar-event-row">
                            <div className={`economic-calendar-event-cell date ${isToday ? 'today' : ''}`}>
                              {eventIndex === 0 ? formatDateAndWeekday(date) : ''}
                            </div>
                            <div className="economic-calendar-event-cell event-name">{event.title}</div>
                            <div className="economic-calendar-event-cell">{actualValue}</div>
                            <div className="economic-calendar-event-cell">{forecastValue}</div>
                            <div className="economic-calendar-event-cell">{historicalValue}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
