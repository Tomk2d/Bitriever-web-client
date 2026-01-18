'use client';

import { NotificationList } from '@/features/notification/components/NotificationList';
import { NotificationProvider } from '@/features/notification/components/NotificationProvider';
import { useUnreadNotificationCount } from '@/features/notification/hooks/useNotifications';

function NotificationPageContent() {
  const { data: unreadCount } = useUnreadNotificationCount();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">알림</h1>
      <div className="mb-4">
        <p>읽지 않은 알림: {unreadCount?.unreadCount || 0}개</p>
      </div>
      <NotificationList />
    </div>
  );
}

export default function NotificationPage() {
  return (
    <NotificationProvider>
      <NotificationPageContent />
    </NotificationProvider>
  );
}
