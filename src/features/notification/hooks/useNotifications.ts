import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import {
  NotificationResponse,
  NotificationType,
  NotificationStatsResponse,
  PageResponse,
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
 * 무한 스크롤용 알림 목록 조회 훅
 */
export const useInfiniteNotifications = (
  read?: boolean,
  type?: NotificationType,
  size: number = 20
) => {
  const hasToken =
    typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useInfiniteQuery({
    queryKey: ['notifications', 'infinite', read, type, size],
    queryFn: ({ pageParam = 0 }) =>
      notificationService.getNotifications(pageParam, size, read, type),
    enabled: hasToken,
    staleTime: 1000 * 30, // 30초
    getNextPageParam: (lastPage: PageResponse<NotificationResponse>) => {
      // 마지막 페이지가 아니면 다음 페이지 번호 반환
      const totalPages = Math.ceil(lastPage.totalElements / lastPage.size);
      if (lastPage.page + 1 < totalPages) {
        return lastPage.page + 1;
      }
      return undefined; // 더 이상 페이지가 없음
    },
    initialPageParam: 0,
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
    onSuccess: (_, notificationId) => {
      // 읽지 않은 개수 캐시 즉시 업데이트
      queryClient.setQueryData<NotificationStatsResponse>(
        ['notifications', 'unread-count'],
        (oldData) => {
          if (!oldData) return oldData;
          const newCount = Math.max(0, (oldData.unreadCount || 0) - 1);
          return { unreadCount: newCount };
        }
      );

      // useInfiniteQuery 캐시 업데이트 (무한 스크롤용)
      queryClient.setQueriesData(
        { queryKey: ['notifications', 'infinite'] },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          
          // 각 페이지에서 해당 알림을 찾아서 업데이트
          const updatedPages = oldData.pages.map((page: PageResponse<NotificationResponse>) => {
            const updatedContent = page.content.map((n: NotificationResponse) =>
              n.id === notificationId ? { ...n, read: true } : n
            );
            return {
              ...page,
              content: updatedContent,
            };
          });
          
          return {
            ...oldData,
            pages: updatedPages,
          };
        }
      );

      // 일반 useQuery 캐시 업데이트 (기존 호환성)
      queryClient.setQueriesData(
        { queryKey: ['notifications'], exact: false },
        (oldData: any) => {
          // useInfiniteQuery가 아닌 경우만 처리
          if (oldData?.pages) return oldData;
          if (!oldData?.content) return oldData;
          
          const updatedContent = oldData.content.map((n: NotificationResponse) =>
            n.id === notificationId ? { ...n, read: true } : n
          );
          return {
            ...oldData,
            content: updatedContent,
          };
        }
      );
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
      // 읽지 않은 개수 캐시 즉시 업데이트 (0으로 설정)
      queryClient.setQueryData<NotificationStatsResponse>(
        ['notifications', 'unread-count'],
        () => ({ unreadCount: 0 })
      );

      // useInfiniteQuery 캐시 업데이트 (무한 스크롤용)
      queryClient.setQueriesData(
        { queryKey: ['notifications', 'infinite'] },
        (oldData: any) => {
          if (!oldData?.pages) return oldData;
          
          // 각 페이지의 모든 알림을 읽음 처리
          const updatedPages = oldData.pages.map((page: PageResponse<NotificationResponse>) => {
            const updatedContent = page.content.map((n: NotificationResponse) => ({
              ...n,
              read: true,
            }));
            return {
              ...page,
              content: updatedContent,
            };
          });
          
          return {
            ...oldData,
            pages: updatedPages,
          };
        }
      );

      // 일반 useQuery 캐시 업데이트 (기존 호환성)
      queryClient.setQueriesData(
        { queryKey: ['notifications'], exact: false },
        (oldData: any) => {
          // useInfiniteQuery가 아닌 경우만 처리
          if (oldData?.pages) return oldData;
          if (!oldData?.content) return oldData;
          
          const updatedContent = oldData.content.map((n: NotificationResponse) => ({
            ...n,
            read: true,
          }));
          return {
            ...oldData,
            content: updatedContent,
          };
        }
      );
    },
  });
};
