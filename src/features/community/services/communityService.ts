import { apiClient } from '@/lib/axios';
import type {
  CommunityRequest,
  CommunityResponse,
  CommunityListResponse,
  CommunitySearchRequest,
  CommunityReactionRequest,
  PageResponse,
  ApiResponse,
} from '../types';

export const communityService = {
  getAll: async (category?: string, page: number = 0, size: number = 20): Promise<PageResponse<CommunityListResponse>> => {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    params.append('page', page.toString());
    params.append('size', size.toString());
    
    const response = await apiClient.get<ApiResponse<PageResponse<CommunityListResponse>>>(`/api/communities?${params.toString()}`);
    return response.data.data;
  },

  getById: async (id: number): Promise<CommunityResponse> => {
    const response = await apiClient.get<ApiResponse<CommunityResponse>>(`/api/communities/${id}`);
    return response.data.data;
  },

  create: async (data: CommunityRequest): Promise<CommunityResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch('/api/proxy/communities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      console.warn('게시글 작성: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('[communityService] Create - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[communityService] Create Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
      });
      const errorMessage = result?.error?.message || result?.message || result?.error || '게시글 작성에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  update: async (id: number, data: Partial<CommunityRequest>): Promise<CommunityResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      console.warn('게시글 수정: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('[communityService] Update - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[communityService] Update Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
        id,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || `게시글 수정에 실패했습니다. (${response.status})`;
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  updateContent: async (id: number, data: Partial<CommunityRequest>): Promise<CommunityResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${id}/update-content`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      console.warn('게시글 수정: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    let result;
    try {
      result = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('[communityService] UpdateContent - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[communityService] UpdateContent Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
        id,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || `게시글 수정에 실패했습니다. (${response.status})`;
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/communities/${id}`);
  },

  search: async (request: CommunitySearchRequest): Promise<PageResponse<CommunityListResponse>> => {
    const params = new URLSearchParams();
    if (request.category) {
      params.append('category', request.category);
    }
    if (request.hashtags && request.hashtags.length > 0) {
      request.hashtags.forEach(tag => params.append('hashtags', tag));
    }
    if (request.searchType) {
      params.append('searchType', request.searchType);
    }
    params.append('page', (request.page || 0).toString());
    params.append('size', (request.size || 20).toString());

    const response = await apiClient.get<ApiResponse<PageResponse<CommunityListResponse>>>(`/api/communities/search?${params.toString()}`);
    return response.data.data;
  },

  uploadImage: async (id: number, file: File): Promise<CommunityResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/proxy/communities/${id}/images`, {
      method: 'POST',
      headers: {
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: formData,
    });

    if (response.status === 401) {
      console.warn('이미지 업로드: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityService] Upload Image Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '이미지 업로드에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  getImageUrl: (id: number, filename: string): string => {
    return `/api/proxy/communities/${id}/images/${encodeURIComponent(filename)}`;
  },

  deleteImage: async (id: number, filename: string): Promise<CommunityResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const encodedFilename = encodeURIComponent(filename);
    const url = `/api/proxy/communities/${id}/images/${encodedFilename}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('이미지 삭제: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.error('[communityService] Delete Image - Non-JSON response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        text: text.substring(0, 500),
        url,
      });
      result = { error: text || '이미지 삭제에 실패했습니다.' };
    }

    if (!response.ok) {
      console.error('[communityService] Delete Image Error:', {
        status: response.status,
        statusText: response.statusText,
        result,
        url,
        id,
        filename,
        encodedFilename,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || '이미지 삭제에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  addReaction: async (id: number, reactionType: string): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${id}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({ reactionType }),
    });

    if (response.status === 401) {
      console.warn('반응 추가: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityService] Add Reaction Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '반응 추가에 실패했습니다.';
      throw new Error(errorMessage);
    }
  },

  removeReaction: async (id: number): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${id}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('반응 삭제: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityService] Remove Reaction Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '반응 삭제에 실패했습니다.';
      throw new Error(errorMessage);
    }
  },
};
