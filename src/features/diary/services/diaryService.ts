import { apiClient } from '@/lib/axios';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

export interface DiaryRequest {
  tradingHistoryId: number;
  content?: string;
  tags?: string[];
  tradingMind?: number | null;
}

export interface DiaryResponse {
  id: number;
  tradingHistoryId: number;
  content: string;
  tags?: string[];
  tradingMind?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export const diaryService = {
  getAll: async (): Promise<DiaryResponse[]> => {
    const response = await apiClient.get('/api/diaries/user');
    return response.data.data;
  },

  getById: async (id: number): Promise<DiaryResponse> => {
    const response = await apiClient.get(`/api/diaries/${id}`);
    return response.data.data;
  },

  create: async (data: DiaryRequest): Promise<DiaryResponse> => {
    const response = await authenticatedFetch('/api/proxy/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[diaryService] Create Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '매매일지 생성에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  update: async (id: number, data: Partial<DiaryRequest>): Promise<DiaryResponse> => {
    const response = await authenticatedFetch(`/api/proxy/diaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let result;
    try {
      result = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('[diaryService] Update - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[diaryService] Update Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
        id,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || `매매일지 수정에 실패했습니다. (${response.status})`;
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  updateContent: async (id: number, data: Partial<DiaryRequest>): Promise<DiaryResponse> => {
    const response = await authenticatedFetch(`/api/proxy/diaries/${id}/update-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let result;
    try {
      result = await response.json();
    } catch (error) {
      const text = await response.text();
      console.error('[diaryService] UpdateContent - JSON parse error:', {
        status: response.status,
        text: text.substring(0, 500),
      });
      throw new Error(`서버 응답을 파싱할 수 없습니다. (${response.status})`);
    }

    if (!response.ok) {
      console.error('[diaryService] UpdateContent Error:', {
        status: response.status,
        result,
        data: JSON.stringify(data),
        id,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || `매매일지 수정에 실패했습니다. (${response.status})`;
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/diaries/${id}`);
  },

  getByTradingHistoryId: async (tradingHistoryId: number): Promise<DiaryResponse | null> => {
    const response = await authenticatedFetch(`/api/proxy/diaries/trading-history/${tradingHistoryId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // 404 에러는 일지가 없는 것이므로 정상적인 경우로 처리
    if (response.status === 404) {
      return null;
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[diaryService] Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '매매일지 조회에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  uploadImage: async (diaryId: number, file: File): Promise<DiaryResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(`/api/proxy/diaries/${diaryId}/images`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[diaryService] Upload Image Error:', result);
      const errorMessage = result?.message || result?.error?.message || result?.error || '이미지 업로드에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },

  getImageUrl: (diaryId: number, filename: string): string => {
    return `/api/proxy/diaries/${diaryId}/images/${encodeURIComponent(filename)}`;
  },

  deleteImage: async (diaryId: number, filename: string): Promise<DiaryResponse> => {
    const encodedFilename = encodeURIComponent(filename);
    const url = `/api/proxy/diaries/${diaryId}/images/${encodedFilename}`;
    console.log('[diaryService.deleteImage] 삭제 요청:', { diaryId, filename, encodedFilename, url });

    const response = await authenticatedFetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    // 응답이 JSON인지 확인
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.error('[diaryService] Delete Image - Non-JSON response:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        text: text.substring(0, 500),
        url,
      });
      result = { error: text || '이미지 삭제에 실패했습니다.' };
    }

    if (!response.ok) {
      console.error('[diaryService] Delete Image Error:', {
        status: response.status,
        statusText: response.statusText,
        result,
        url,
        diaryId,
        filename,
        encodedFilename,
      });
      const errorMessage = result?.message || result?.error?.message || result?.error || '이미지 삭제에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data || null;
  },
};

