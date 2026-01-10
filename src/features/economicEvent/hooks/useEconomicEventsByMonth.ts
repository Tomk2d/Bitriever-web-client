import { useQuery, useQueries } from '@tanstack/react-query';
import { economicEventService } from '../services/economicEventService';
import { EconomicEventResponse } from '../types';

const formatYearMonth = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthsToFetch = (): string[] => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // 2026년 1월부터만 데이터가 존재
  const startYear = 2026;
  const startMonth = 0; // 1월 (0-based)
  
  const months: string[] = [];
  
  // 현재 날짜가 2026년 1월 이전이면 2026년 1월부터 시작
  let year = Math.max(currentYear, startYear);
  let month = currentYear < startYear ? startMonth : currentMonth;
  
  // 현재월부터 +2개월까지 (최대 3개월)
  for (let i = 0; i < 3; i++) {
    const date = new Date(year, month + i, 1);
    const yearMonth = formatYearMonth(date);
    
    // 2026년 1월 이전은 제외
    if (date.getFullYear() >= startYear && (date.getFullYear() > startYear || date.getMonth() >= startMonth)) {
      months.push(yearMonth);
    }
  }
  
  return months;
};

export const useEconomicEventsByMonth = (yearMonth: string) => {
  return useQuery<EconomicEventResponse[]>({
    queryKey: ['economicEvents', 'month', yearMonth],
    queryFn: () => economicEventService.getEventsByYearMonth(yearMonth),
    enabled: !!yearMonth && yearMonth.length > 0, // yearMonth가 있을 때만 실행
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 2, // 2시간
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useEconomicEventsPrefetch = () => {
  const months = getMonthsToFetch();
  
  const queries = useQueries({
    queries: months.map((yearMonth) => ({
      queryKey: ['economicEvents', 'month', yearMonth],
      queryFn: () => economicEventService.getEventsByYearMonth(yearMonth),
      staleTime: 1000 * 60 * 60, // 1시간
      gcTime: 1000 * 60 * 60 * 2, // 2시간
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  });
  
  return queries;
};
