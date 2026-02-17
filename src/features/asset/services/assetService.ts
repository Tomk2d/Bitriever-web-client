import { authenticatedFetch } from '@/lib/authenticatedFetch';
import type { AssetResponse } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1초, 2초, 4초

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const assetService = {
  syncAssets: async (): Promise<boolean> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!accessToken) {
      console.warn('자산 동기화: JWT 토큰이 없어 요청을 보내지 않습니다.');
      return false;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await authenticatedFetch('/api/proxy/assets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || result.error?.message || '자산 동기화에 실패했습니다.');
        }

        // 성공 (202 Accepted 또는 200 OK)
        console.log('자산 동기화 요청 성공');
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('알 수 없는 에러');
        console.error(`자산 동기화 시도 ${attempt + 1}/${MAX_RETRIES} 실패:`, lastError.message);

        // 마지막 시도가 아니면 지수 백오프 대기
        if (attempt < MAX_RETRIES - 1) {
          const delayMs = RETRY_DELAYS[attempt];
          console.log(`자산 동기화 재시도 대기: ${delayMs}ms`);
          await delay(delayMs);
        }
      }
    }

    // 모든 재시도 실패
    console.error('자산 동기화: 모든 재시도 실패', lastError);
    return false;
  },

  getUserAssets: async (): Promise<AssetResponse[]> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.');
    }

    const response = await authenticatedFetch('/api/proxy/assets', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '자산 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

