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

    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '로그아웃에 실패했습니다.');
    }
    
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

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '사용자 정보를 가져오는데 실패했습니다.');
    }

    return result.data;
  },
};

