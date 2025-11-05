import { apiClient } from '@/lib/axios';

export interface DiaryRequest {
  tradingHistoryId: number;
  content: string;
  tags?: string[];
}

export interface DiaryResponse {
  id: number;
  tradingHistoryId: number;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
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
    const response = await apiClient.post('/api/diaries', data);
    return response.data.data;
  },

  update: async (id: number, data: Partial<DiaryRequest>): Promise<DiaryResponse> => {
    const response = await apiClient.put(`/api/diaries/${id}`, data);
    return response.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/diaries/${id}`);
  },
};

