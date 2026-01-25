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
    
    let shouldIncreaseUnreadCount = false;
    let shouldDecreaseUnreadCount = false;
    
    // useInfiniteQuery 캐시 업데이트 (무한 스크롤용)
    queryClient.setQueriesData(
      { queryKey: ['notifications', 'infinite'] },
      (oldData: any) => {
        if (!oldData?.pages) return oldData;
        
        // 첫 번째 페이지에서 중복 확인
        const firstPage = oldData.pages[0];
        if (firstPage?.content) {
          const existingIndex = firstPage.content.findIndex(
            (n: NotificationResponse) => n.id === notification.id
          );
          
          if (existingIndex >= 0) {
            // 이미 존재하면 업데이트만
            const updatedContent = [...firstPage.content];
            const oldNotification = updatedContent[existingIndex];
            updatedContent[existingIndex] = notification;
            
            // 읽지 않은 개수 업데이트 플래그 설정
            if (oldNotification.read && !notification.read) {
              shouldIncreaseUnreadCount = true;
            } else if (!oldNotification.read && notification.read) {
              shouldDecreaseUnreadCount = true;
            }
            
            // 첫 번째 페이지 업데이트
            const updatedPages = [...oldData.pages];
            updatedPages[0] = {
              ...firstPage,
              content: updatedContent,
            };
            
            return {
              ...oldData,
              pages: updatedPages,
            };
          }
        }
        
        // 새 알림인 경우 - 첫 번째 페이지의 맨 앞에 추가
        if (!notification.read) {
          shouldIncreaseUnreadCount = true;
        }
        
        const updatedPages = [...oldData.pages];
        if (updatedPages[0]) {
          updatedPages[0] = {
            ...updatedPages[0],
            content: [notification, ...(updatedPages[0].content || [])],
            totalElements: (updatedPages[0].totalElements || 0) + 1,
          };
        } else {
          // 페이지가 없으면 새로 생성
          updatedPages[0] = {
            content: [notification],
            page: 0,
            size: 20,
            totalElements: 1,
          };
        }
        
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
        if (!oldData) return oldData;
        
        // 이미 같은 ID의 알림이 있으면 추가하지 않음 (중복 방지)
        const existingIndex = oldData.content?.findIndex(
          (n: NotificationResponse) => n.id === notification.id
        );
        
        if (existingIndex !== undefined && existingIndex >= 0) {
          // 이미 존재하면 업데이트만
          const updatedContent = [...oldData.content];
          const oldNotification = updatedContent[existingIndex];
          updatedContent[existingIndex] = notification;
          
          // 읽지 않은 개수 업데이트 플래그 설정 (읽음 -> 안읽음으로 변경된 경우)
          if (oldNotification.read && !notification.read) {
            shouldIncreaseUnreadCount = true;
          }
          // 안읽음 -> 읽음으로 변경된 경우
          else if (!oldNotification.read && notification.read) {
            shouldDecreaseUnreadCount = true;
          }
          
          return {
            ...oldData,
            content: updatedContent,
          };
        }
        
        // 새 알림인 경우
        if (!notification.read) {
          shouldIncreaseUnreadCount = true;
        }
        
        // 새 알림을 맨 앞에 추가 (최신순)
        return {
          ...oldData,
          content: [notification, ...(oldData.content || [])],
          totalElements: (oldData.totalElements || 0) + 1,
        };
      }
    );

    // 읽지 않은 개수 캐시 갱신 (setQueriesData 외부에서 별도로 호출하여 즉시 반영)
    // 함수형 업데이트를 사용하여 항상 최신 상태를 보장
    if (shouldIncreaseUnreadCount) {
      queryClient.setQueryData<{ unreadCount: number }>(
        ['notifications', 'unread-count'],
        (oldData) => {
          const currentCount = oldData?.unreadCount ?? 0;
          console.log('[NotificationProvider] 읽지 않은 개수 증가:', currentCount, '->', currentCount + 1);
          return { unreadCount: currentCount + 1 };
        }
      );
    } else if (shouldDecreaseUnreadCount) {
      queryClient.setQueryData<{ unreadCount: number }>(
        ['notifications', 'unread-count'],
        (oldData) => {
          const currentCount = oldData?.unreadCount ?? 0;
          const newCount = Math.max(0, currentCount - 1);
          console.log('[NotificationProvider] 읽지 않은 개수 감소:', currentCount, '->', newCount);
          return { unreadCount: newCount };
        }
      );
    }

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
