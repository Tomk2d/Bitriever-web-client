export enum NotificationType {
  USER_ACTIVITY = 'USER_ACTIVITY',
  SYSTEM = 'SYSTEM',
  TRADING = 'TRADING',
}

export interface NotificationResponse {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  content: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  metadata: string | null;
}

export interface NotificationStatsResponse {
  unreadCount: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
  timestamp?: string;
}
