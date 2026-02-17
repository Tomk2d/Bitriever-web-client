export enum NotificationType {
  USER_ACTIVITY = 'USER_ACTIVITY',
  SYSTEM = 'SYSTEM',
  TRADING = 'TRADING',
  AI_SYSTEM = 'AI_SYSTEM',
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

/** 매매 분석 완료 SSE 이벤트 페이로드 (서버 trade-evaluation 이벤트) */
export interface TradeEvaluationEventPayload {
  success: boolean;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | 'PENDING';
  tradeId: number;
  targetDate: string;
  completedAt: string;
  symbol: string;
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
