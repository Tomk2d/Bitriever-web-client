import { apiClient } from '@/lib/axios';

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
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data.data;
  },
};

