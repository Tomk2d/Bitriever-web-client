import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import {
  NotificationResponse,
  NotificationType,
  NotificationStatsResponse,
} from '../types';

/**
 * 알림 목록 조회 훅
 */
export const useNotifications = (
  page: number = 0,
  size: number = 20,
  read?: boolean,
  type?: NotificationType
) => {
  const hasToken =
    typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useQuery({
    queryKey: ['notifications', page, size, read, type],
    queryFn: () => notificationService.getNotifications(page, size, read, type),
    enabled: hasToken,
    staleTime: 1000 * 30, // 30초
  });
};

/**
 * 읽지 않은 알림 개수 조회 훅
 */
export const useUnreadNotificationCount = () => {
  const hasToken =
    typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: hasToken,
    staleTime: 1000 * 10, // 10초
    refetchInterval: 1000 * 30, // 30초마다 자동 갱신
  });
};

/**
 * 알림 읽음 처리 훅
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: number) =>
      notificationService.markAsRead(notificationId),
    onSuccess: () => {
      // 알림 목록과 읽지 않은 개수 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * 전체 알림 읽음 처리 훅
 */
export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      // 알림 목록과 읽지 않은 개수 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
