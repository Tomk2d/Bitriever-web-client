'use client';

import { useNotificationSSE } from '../hooks/useNotificationSSE';
import { NotificationResponse } from '../types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * SSE로 실시간 알림을 수신하고 캐시를 갱신하는 Provider
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const handleNotification = (notification: NotificationResponse) => {
    console.log('[NotificationProvider] 새 알림 수신:', notification);
    
    // 모든 notifications 쿼리 캐시에 새 알림 추가
    // queryClient.setQueriesData를 사용하여 모든 notifications 쿼리를 업데이트
    queryClient.setQueriesData(
      { queryKey: ['notifications'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        // 이미 같은 ID의 알림이 있으면 추가하지 않음 (중복 방지)
        const existingIndex = oldData.content?.findIndex(
          (n: NotificationResponse) => n.id === notification.id
        );
        
        if (existingIndex !== undefined && existingIndex >= 0) {
          // 이미 존재하면 업데이트만
          const updatedContent = [...oldData.content];
          updatedContent[existingIndex] = notification;
          return {
            ...oldData,
            content: updatedContent,
          };
        }
        
        // 새 알림을 맨 앞에 추가 (최신순)
        return {
          ...oldData,
          content: [notification, ...(oldData.content || [])],
          totalElements: (oldData.totalElements || 0) + 1,
        };
      }
    );

    // 읽지 않은 개수 캐시 갱신
    queryClient.setQueryData(
      ['notifications', 'unread-count'],
      (oldData: any) => {
        if (!oldData) {
          return { unreadCount: 1 };
        }
        return {
          ...oldData,
          unreadCount: (oldData.unreadCount || 0) + 1,
        };
      }
    );

    // 브라우저 알림 표시 (선택사항)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content || '',
        icon: '/data/main-logo-ex.png',
      });
    }
  };

  const handleConnect = () => {
    console.log('[NotificationProvider] SSE 연결됨');
  };

  const handleError = (error: Event) => {
    console.error('[NotificationProvider] SSE 에러:', error);
  };

  // SSE 연결
  useNotificationSSE({
    onNotification: handleNotification,
    onConnect: handleConnect,
    onError: handleError,
    autoConnect: true,
  });

  // 브라우저 알림 권한 요청 (선택사항)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return <>{children}</>;
}
