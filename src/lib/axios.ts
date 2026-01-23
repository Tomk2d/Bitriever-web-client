import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authService } from '@/features/auth/services/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 전송을 위해 필요
});

// 토큰 갱신 중 중복 요청 방지를 위한 플래그 및 Promise
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// 토큰 갱신 완료 후 대기 중인 요청들에 새 토큰 전달
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// 토큰 갱신 대기 큐에 추가
const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // 로컬 스토리지에서 토큰 가져오기
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // 401 에러 처리
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // 이미 토큰 갱신 중인 경우, 갱신 완료를 대기
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token으로 새 토큰 발급 시도
        const authData = await authService.refreshToken();
        const newAccessToken = authData.accessToken;

        // 대기 중인 모든 요청에 새 토큰 전달
        onTokenRefreshed(newAccessToken);

        // 원래 요청을 새 토큰으로 재시도
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token도 만료된 경우 로그아웃 처리
        console.warn('토큰 갱신 실패 - 로그아웃 처리');
        try {
          await authService.logout();
        } catch (logoutError) {
          console.error('로그아웃 처리 중 에러:', logoutError);
        }
        // 로그인 페이지로 리다이렉트
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

