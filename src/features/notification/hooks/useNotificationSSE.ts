import { useEffect, useRef, useState, useCallback } from 'react';
import { NotificationResponse, TradeEvaluationEventPayload } from '../types';

interface UseNotificationSSEOptions {
  onNotification?: (notification: NotificationResponse) => void;
  /** 매매 분석 완료/실패 이벤트 (이벤트명: trade-evaluation) */
  onTradeEvaluation?: (payload: TradeEvaluationEventPayload) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export const useNotificationSSE = (options: UseNotificationSSEOptions = {}) => {
  const {
    onNotification,
    onTradeEvaluation,
    onConnect,
    onError,
    onDisconnect,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    // 기존 연결이 있으면 닫기
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // 토큰 가져오기
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!token) {
      console.warn('[SSE] 토큰이 없어 연결할 수 없습니다.');
      return;
    }

    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
    // 쿼리 파라미터로 토큰 전달
    const url = `${API_BASE_URL}/api/sse/notifications?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // 연결 성공
    eventSource.onopen = () => {
      console.log('[SSE] 연결됨');
      setIsConnected(true);
      setError(null);
      onConnect?.();
    };

    // 알림 수신
    eventSource.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse(event.data) as NotificationResponse;
        console.log('[SSE] 알림 수신:', notification);
        onNotification?.(notification);
      } catch (error) {
        console.error('[SSE] 알림 파싱 실패:', error);
      }
    });

    // 매매 분석 완료/실패 수신 (notifications와 동일 연결, 이벤트명만 다름)
    eventSource.addEventListener('trade-evaluation', (event) => {
      try {
        const payload = JSON.parse(event.data) as TradeEvaluationEventPayload;
        console.log('[SSE] 매매 분석 이벤트 수신:', payload);
        onTradeEvaluation?.(payload);
      } catch (error) {
        console.error('[SSE] 매매 분석 이벤트 파싱 실패:', error);
      }
    });

    // Heartbeat 수신
    eventSource.addEventListener('heartbeat', (event) => {
      console.log('[SSE] Heartbeat 수신:', event.data);
    });

    // 연결 이벤트 수신
    eventSource.addEventListener('connect', (event) => {
      console.log('[SSE] 연결 확인:', event.data);
    });

    // 에러 처리
    eventSource.onerror = (err) => {
      console.error('[SSE] 연결 에러:', err);
      setError(err);
      setIsConnected(false);
      onError?.(err);

      // 연결이 끊기면 재연결 시도 (EventSource는 자동 재연결을 시도함)
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] 연결 종료됨');
        onDisconnect?.();
      }
    };
  }, [onNotification, onTradeEvaluation, onConnect, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      onDisconnect?.();
    }
  }, [onDisconnect]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
  };
};
