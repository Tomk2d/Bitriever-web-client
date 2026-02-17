import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { AssetAnalysisResponse } from '../types';

export const assetAnalysisService = {
  getAssetAnalysis: async (): Promise<AssetAnalysisResponse> => {
    const response = await authenticatedFetch('/api/proxy/asset-analysis', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '자산 분석 조회에 실패했습니다.');
    }

    return result.data || null;
  },
};
