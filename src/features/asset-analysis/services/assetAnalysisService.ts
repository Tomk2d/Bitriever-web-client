import { AssetAnalysisResponse } from '../types';

export const assetAnalysisService = {
  getAssetAnalysis: async (): Promise<AssetAnalysisResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch('/api/proxy/asset-analysis', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    // 401 에러 발생 시 로그아웃 처리
    if (response.status === 401) {
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '자산 분석 조회에 실패했습니다.');
    }

    return result.data || null;
  },
};
