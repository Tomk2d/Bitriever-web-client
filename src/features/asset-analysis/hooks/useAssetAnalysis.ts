import { useQuery } from '@tanstack/react-query';
import { useHasAccessToken } from '@/features/auth/hooks/useAccessToken';
import { assetAnalysisService } from '../services/assetAnalysisService';
import { AssetAnalysisResponse } from '../types';

export const useAssetAnalysis = () => {
  const hasToken = useHasAccessToken();

  return useQuery<AssetAnalysisResponse>({
    queryKey: ['assetAnalysis'],
    queryFn: () => assetAnalysisService.getAssetAnalysis(),
    enabled: hasToken,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};
