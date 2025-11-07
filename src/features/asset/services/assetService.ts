import { authService } from '@/features/auth/services/authService';
import type { AssetResponse } from '../types';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 1초, 2초, 4초

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleUnauthorized = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('로그아웃 처리 중 에러:', error);
  }
  
  // 토큰 제거 (이미 logout에서 처리되지만 확실히 하기 위해)
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
};

export const assetService = {
  syncAssets: async (): Promise<boolean> => {
    // JWT 토큰 검증
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!accessToken) {
      console.warn('자산 동기화: JWT 토큰이 없어 요청을 보내지 않습니다.');
      return false;
    }

    let lastError: Error | null = null;

    // 재시도 로직
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/proxy/assets/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const result = await response.json();

        // 401 에러 발생 시 로그아웃 처리 및 로그인 페이지로 리다이렉트
        if (response.status === 401) {
          console.warn('자산 동기화: 인증 실패 (401) - 로그아웃 처리');
          await handleUnauthorized();
          return false;
        }

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

    const response = await fetch('/api/proxy/assets', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();

    // 401 에러 발생 시 로그아웃 처리 및 로그인 페이지로 리다이렉트
    if (response.status === 401) {
      console.warn('자산 조회: 인증 실패 (401) - 로그아웃 처리');
      await handleUnauthorized();
      throw new Error('인증에 실패했습니다.');
    }

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '자산 조회에 실패했습니다.');
    }

    return result.data || [];
  },
};

