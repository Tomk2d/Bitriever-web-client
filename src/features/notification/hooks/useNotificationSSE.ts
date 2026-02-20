import { useEffect, useRef, useState, useCallback } from 'react';
import { getBackendUrl } from '@/lib/env';
import { authService } from '@/features/auth/services/authService';
import { NotificationResponse, TradeEvaluationEventPayload } from '../types';

const MAX_RECONNECT_ATTEMPTS = 5;

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
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const disconnectRequestedRef = useRef(false);

  const connect = useCallback(() => {
    disconnectRequestedRef.current = false;
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

    const url = `${getBackendUrl()}/api/sse/notifications?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // 연결 성공
    eventSource.onopen = () => {
      console.log('[SSE] 연결됨');
      reconnectAttemptsRef.current = 0;
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

    // 에러 처리: 토큰 만료 등으로 끊기면 refresh 후 새 토큰으로 재연결
    eventSource.onerror = (err) => {
      console.error('[SSE] 연결 에러:', err);
      setError(err);
      setIsConnected(false);
      onError?.(err);

      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] 연결 종료됨');
      }

      // 사용자가 disconnect() 호출로 끊은 경우 재연결하지 않음
      if (disconnectRequestedRef.current) return;
      // 이미 재연결 중이면 중복 실행 방지
      if (isReconnectingRef.current) return;

      eventSource.close();
      eventSourceRef.current = null;

      isReconnectingRef.current = true;
      (async () => {
        try {
          await authService.refreshToken();
          reconnectAttemptsRef.current += 1;
          if (reconnectAttemptsRef.current <= MAX_RECONNECT_ATTEMPTS) {
            console.log('[SSE] 토큰 갱신 후 재연결 시도:', reconnectAttemptsRef.current);
            connect();
          } else {
            console.warn('[SSE] 재연결 최대 횟수 초과');
            onDisconnect?.();
          }
        } catch (e) {
          console.error('[SSE] 토큰 갱신 실패, 재연결 중단:', e);
          onDisconnect?.();
        } finally {
          isReconnectingRef.current = false;
        }
      })();
    };
  }, [onNotification, onTradeEvaluation, onConnect, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    disconnectRequestedRef.current = true;
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
