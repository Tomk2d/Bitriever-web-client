import { useQuery } from '@tanstack/react-query';
import { longShortService, LongShortResponse, LongShortPeriod } from '../services/longShortService';

export const useLongShort = (symbol: string | null, period: LongShortPeriod = '1h') => {
  return useQuery<LongShortResponse[]>({
    queryKey: ['longShort', symbol, period],
    queryFn: () => {
      if (!symbol) {
        return Promise.resolve([]);
      }
      return longShortService.getLongShortRatio(symbol, period);
    },
    enabled: !!symbol,
    staleTime: 0, // 즉시 stale로 만들어 캐싱 비활성화
    gcTime: 0, // 캐시를 즉시 삭제
    refetchOnMount: 'always', // 마운트 시 항상 새로 가져오기
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

