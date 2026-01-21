import { apiClient } from '@/lib/axios';
import type {
  CommunityCommentRequest,
  CommunityCommentResponse,
  CommunityReactionRequest,
  PageResponse,
  ApiResponse,
} from '../types';

export const communityCommentService = {
  getComments: async (communityId: number, page: number = 0, size: number = 20): Promise<PageResponse<CommunityCommentResponse>> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    
    const response = await apiClient.get<ApiResponse<PageResponse<CommunityCommentResponse>>>(`/api/communities/${communityId}/comments?${params.toString()}`);
    return response.data.data;
  },

  createComment: async (communityId: number, data: CommunityCommentRequest): Promise<CommunityCommentResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${communityId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      console.warn('댓글 작성: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityCommentService] Create Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '댓글 작성에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  updateComment: async (communityId: number, id: number, data: Partial<CommunityCommentRequest>): Promise<CommunityCommentResponse> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${communityId}/comments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(data),
    });

    if (response.status === 401) {
      console.warn('댓글 수정: 인증 실패 (401) - 로그아웃 처리');
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
      console.error('[communityCommentService] Update - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[communityCommentService] Update Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
        id,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || `댓글 수정에 실패했습니다. (${response.status})`;
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  deleteComment: async (communityId: number, id: number): Promise<void> => {
    await apiClient.delete(`/api/communities/${communityId}/comments/${id}`);
  },

  addReaction: async (communityId: number, id: number, reactionType: string): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${communityId}/comments/${id}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({ reactionType }),
    });

    if (response.status === 401) {
      console.warn('댓글 반응 추가: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityCommentService] Add Reaction Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '반응 추가에 실패했습니다.';
      throw new Error(errorMessage);
    }
  },

  removeReaction: async (communityId: number, id: number): Promise<void> => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const response = await fetch(`/api/proxy/communities/${communityId}/comments/${id}/reactions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('댓글 반응 삭제: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[communityCommentService] Remove Reaction Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '반응 삭제에 실패했습니다.';
      throw new Error(errorMessage);
    }
  },
};
