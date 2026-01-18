'use client';

import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { useState } from 'react';
import { NotificationList } from './NotificationList';
import './NotificationBell.css';

export function NotificationBell() {
  const { data: unreadCount } = useUnreadNotificationCount();
  const [isOpen, setIsOpen] = useState(false);

  const count = unreadCount?.unreadCount || 0;

  return (
    <div className="notification-bell-container">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="알림"
      >
        🔔
        {count > 0 && (
          <span className="notification-badge">{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>알림</h3>
            <button onClick={() => setIsOpen(false)}>닫기</button>
          </div>
          <div className="notification-dropdown-content">
            <NotificationList />
          </div>
        </div>
      )}
    </div>
  );
}
