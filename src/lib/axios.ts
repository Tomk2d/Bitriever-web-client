import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키 전송을 위해 필요
});

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
  (error) => {
    // 401 에러 처리
    if (error.response?.status === 401) {
      // 인증 실패 시 토큰 제거
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // 로그인 페이지로 리다이렉트
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

