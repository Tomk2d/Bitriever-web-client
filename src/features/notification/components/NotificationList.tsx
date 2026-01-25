'use client';

import { useInfiniteNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { NotificationType, NotificationResponse } from '../types';
import { useState, useMemo, useRef, useEffect } from 'react';
import './NotificationList.css';

export function NotificationList() {
  const [readFilter, setReadFilter] = useState<boolean | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<NotificationType | undefined>(undefined);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<number>>(new Set()); // 확장된 알림 ID
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);
  const pageSize = 20;

  // 무한 스크롤로 알림 데이터 가져오기 (서버에서 필터링)
  const { 
    data: notificationsData, 
    isLoading, 
    error, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteNotifications(readFilter, typeFilter, pageSize);
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  // 모든 페이지의 알림을 하나의 배열로 합치기
  const allNotifications = useMemo(() => {
    if (!notificationsData?.pages) {
      return [];
    }
    return notificationsData.pages.flatMap((page) => page.content);
  }, [notificationsData]);

  // 필터 변경 시 스크롤 최상단으로 이동
  useEffect(() => {
    if (itemsContainerRef.current) {
      itemsContainerRef.current.scrollTop = 0;
    }
  }, [readFilter, typeFilter]);

  // 무한 스크롤: Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          // 다음 페이지 로드
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const handleToggleExpand = (notificationId: number) => {
    setExpandedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error('전체 알림 읽음 처리 실패:', error);
    }
  };

  // 필터 변경 시 스크롤 최상단으로 이동
  const handleFilterChange = (newReadFilter: boolean | undefined) => {
    setReadFilter(newReadFilter);
    // 스크롤을 최상단으로 이동
    if (itemsContainerRef.current) {
      itemsContainerRef.current.scrollTop = 0;
    }
  };

  if (isLoading) {
    return <div>알림을 불러오는 중...</div>;
  }

  if (error) {
    return <div>알림을 불러오는 중 오류가 발생했습니다.</div>;
  }

  return (
    <div className="notification-list">
      <div className="notification-filters">
        <button
          onClick={() => handleFilterChange(undefined)}
          className={readFilter === undefined ? 'active' : ''}
        >
          전체
        </button>
        <button
          onClick={() => handleFilterChange(false)}
          className={readFilter === false ? 'active' : ''}
        >
          안읽음
        </button>
        <button
          onClick={() => handleFilterChange(true)}
          className={readFilter === true ? 'active' : ''}
        >
          읽음
        </button>
        <button className="notification-mark-all-read" onClick={handleMarkAllAsRead}>전체 읽음 처리</button>
      </div>

      <div className="notification-items" ref={itemsContainerRef}>
        {allNotifications.length > 0 ? (
          <>
            {allNotifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id);
              return (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                    handleToggleExpand(notification.id);
                  }}
                >
                  <div className="notification-header">
                    <span className="notification-type">{notification.type}</span>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="notification-title">{notification.title}</div>
                  {notification.content && (
                    <div className={`notification-content ${isExpanded ? 'expanded' : ''}`}>
                      {notification.content}
                    </div>
                  )}
                  {!notification.read && <span className="unread-dot"></span>}
                </div>
              );
            })}
            {/* 무한 스크롤 감지용 요소 */}
            {hasNextPage && (
              <div ref={observerTargetRef} className="notification-observer-target">
                <div className="notification-loading-more">
                  {isFetchingNextPage ? '더 불러오는 중...' : '스크롤하여 더 보기'}
                </div>
              </div>
            )}
            {!hasNextPage && allNotifications.length > 0 && (
              <div className="notification-end-message">모든 알림을 불러왔습니다.</div>
            )}
          </>
        ) : (
          <div className="notification-empty">알림이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
