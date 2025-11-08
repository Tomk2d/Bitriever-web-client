import { apiClient } from '@/lib/axios';
import { queryClient } from '@/lib/react-query';
import { store } from '@/lib/redux';
import { clearUser } from '@/store/slices/authSlice';
import type { UserResponse } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '로그인에 실패했습니다.');
    }

    const authData = result.data;
    
    // JWT 토큰을 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
    }
    
    return authData;
  },

  signup: async (data: SignupRequest): Promise<void> => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '회원가입에 실패했습니다.');
    }
  },

  logout: async (): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    // 서버에 로그아웃 요청 시도 (실패해도 계속 진행)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      // 401 에러는 토큰 만료로 인한 것이므로 정상적인 시나리오로 간주
      if (response.status !== 401) {
        const result = await response.json();
        if (!response.ok) {
          console.warn('로그아웃 서버 요청 실패:', result.message || result.error?.message);
        }
      }
    } catch (error) {
      // 네트워크 에러 등은 무시하고 로컬 정리 계속 진행
      console.warn('로그아웃 서버 요청 중 에러 (무시):', error);
    }
    
    // 서버 응답과 관계없이 항상 로컬 정리 수행
    // 로컬 스토리지에서 토큰 제거
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    // Redux store의 유저 관련 state 초기화
    store.dispatch(clearUser());
    
    // React Query 캐시 모두 클리어
    queryClient.clear();
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 401 에러 발생 시 로그아웃 처리
    if (response.status === 401) {
      console.warn('사용자 정보 조회: 인증 실패 (401) - 로그아웃 처리');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '사용자 정보를 가져오는데 실패했습니다.');
    }

    return result.data;
  },
};

