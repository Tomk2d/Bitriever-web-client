import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { assetAnalysisService } from '../services/assetAnalysisService';
import { AssetAnalysisResponse } from '../types';

export const useAssetAnalysis = () => {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 토큰 확인
    setHasToken(!!localStorage.getItem('accessToken'));
  }, []);

  return useQuery<AssetAnalysisResponse>({
    queryKey: ['assetAnalysis'],
    queryFn: () => assetAnalysisService.getAssetAnalysis(),
    enabled: hasToken,
    staleTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
};
