import { useQuery } from '@tanstack/react-query';
import { assetService } from '../services/assetService';

export const useAssets = (enabled: boolean = true) => {
  // 토큰 확인
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      return assetService.getUserAssets();
    },
    enabled: hasToken && enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });
};

