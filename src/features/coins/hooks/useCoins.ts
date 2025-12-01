import { useQuery } from '@tanstack/react-query';
import { coinService, CoinResponse } from '../services/coinService';

export const useCoins = (quoteCurrency: string) => {
  return useQuery<CoinResponse[]>({
    queryKey: ['coins', quoteCurrency],
    queryFn: () => coinService.getAllByQuoteCurrency(quoteCurrency),
    staleTime: 1000 * 60 * 60, // 1시간 - 데이터가 신선하다고 간주하는 시간
    gcTime: 1000 * 60 * 60 * 2, // 2시간 - 캐시에 유지하는 시간
    refetchOnWindowFocus: false, // 창 포커스 시 자동 리패치 비활성화
    retry: 1, // 실패 시 1번만 재시도
  });
};

