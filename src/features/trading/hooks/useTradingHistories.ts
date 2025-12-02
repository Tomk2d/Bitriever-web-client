import { useQuery } from '@tanstack/react-query';
import { tradingHistoryService } from '../services/tradingHistoryService';
import { getMonthStartDate, getMonthEndDate } from '@/shared/utils/dateUtils';

export const useTradingHistories = (activeStartDate: Date | null) => {
  const year = activeStartDate?.getFullYear();
  const month = activeStartDate ? activeStartDate.getMonth() + 1 : null;

  // 토큰 확인
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useQuery({
    queryKey: ['trading-histories', year, month],
    queryFn: async () => {
      if (!activeStartDate) {
        return [];
      }

      const startDate = getMonthStartDate(activeStartDate);
      const endDate = getMonthEndDate(activeStartDate);

      return tradingHistoryService.getByDateRange(startDate, endDate);
    },
    enabled: !!activeStartDate && hasToken,
    staleTime: 1000 * 60 * 5,
  });
};

