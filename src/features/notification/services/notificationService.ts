import { apiClient } from '@/lib/axios';
import {
  NotificationResponse,
  NotificationStatsResponse,
  NotificationType,
  PageResponse,
  ApiResponse,
} from '../types';

export const notificationService = {
  /**
   * 알림 목록 조회
   */
  getNotifications: async (
    page: number = 0,
    size: number = 20,
    read?: boolean,
    type?: NotificationType
  ): Promise<PageResponse<NotificationResponse>> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (read !== undefined) {
      params.append('read', read.toString());
    }
    if (type) {
      params.append('type', type);
    }

    const response = await apiClient.get<ApiResponse<PageResponse<NotificationResponse>>>(
      `/api/notifications?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * 읽지 않은 알림 개수 조회
   */
  getUnreadCount: async (): Promise<NotificationStatsResponse> => {
    const response = await apiClient.get<ApiResponse<NotificationStatsResponse>>(
      '/api/notifications/unread-count'
    );
    return response.data.data;
  },

  /**
   * 알림 읽음 처리
   */
  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/api/notifications/${notificationId}/read`);
  },

  /**
   * 전체 알림 읽음 처리
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/api/notifications/read-all');
  },
};
