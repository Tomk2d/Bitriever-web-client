import { useQuery } from '@tanstack/react-query';
import { useHasAccessToken } from '@/features/auth/hooks/useAccessToken';
import { assetService } from '../services/assetService';

export const useAssets = (enabled: boolean = true) => {
  // 토큰 확인
  const hasToken = useHasAccessToken();

  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      return assetService.getUserAssets();
    },
    enabled: hasToken && enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });
};

