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
  nickname: string | null;
  profileUrl: string;
  accessToken: string;
  requiresNickname?: boolean; // SNS 회원가입 시 닉네임 설정 필요 여부
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
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
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', authData.accessToken);
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

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '토큰 갱신에 실패했습니다.');
    }

    const authData = result.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', authData.accessToken);
    }
    
    return authData;
  },

  logout: async (): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });

      if (response.status !== 401) {
        const result = await response.json();
        if (!response.ok) {
          console.warn('로그아웃 서버 요청 실패:', result.message || result.error?.message);
        }
      }
    } catch (error) {
      console.warn('로그아웃 서버 요청 중 에러 (무시):', error);
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }

    // Redux store의 유저 관련 state 초기화
    store.dispatch(clearUser());
    
    // React Query 캐시 모두 클리어
    queryClient.clear();
  },

  checkNicknameAvailable: async (nickname: string): Promise<boolean> => {
    const response = await fetch(`/api/proxy/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '닉네임 중복 확인에 실패했습니다.');
    }

    return result.data;
  },

  setNickname: async (nickname: string): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const response = await fetch('/api/proxy/auth/set-nickname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ nickname }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '닉네임 설정에 실패했습니다.');
    }
  },

  setProfileUrl: async (profileUrl: string): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!accessToken) {
      throw new Error('로그인이 필요합니다.');
    }

    const response = await fetch('/api/proxy/auth/set-profile-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ profileUrl }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error?.message || '프로필 변경에 실패했습니다.');
    }
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.');
    }
    
    const fetchMe = async (token: string) => {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      return response;
    };

    let currentToken = accessToken;

    // 1차 시도
    let response = await fetchMe(currentToken);

    // access token 만료 등으로 401이면 refresh 후 한 번만 재시도
    if (response.status === 401) {
      console.warn('사용자 정보 조회: 401 - access token 갱신 시도');
      try {
        const authData = await authService.refreshToken();
        currentToken = authData.accessToken;
        response = await fetchMe(currentToken);
      } catch (refreshError) {
        console.warn('토큰 갱신 실패 - 로그아웃 처리');
        await authService.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('인증에 실패했습니다.');
      }
    }

    // refresh 후에도 401인 경우 최종적으로 로그아웃 처리
    if (response.status === 401) {
      console.warn('사용자 정보 조회: refresh 후에도 401 - 로그아웃 처리');
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

