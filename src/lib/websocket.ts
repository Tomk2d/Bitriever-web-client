import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getWebSocketUrl } from '@/lib/env';

const WS_URL = getWebSocketUrl();

export interface WebSocketMessage {
  type: string;
  data: any;
}

export class WebSocketClient {
  private client: Client | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || null;
  }

  connect(
    onConnect?: () => void,
    onError?: (error: any) => void,
    onDisconnect?: () => void
  ): void {
    if (this.client?.connected) {
      return;
    }

    // 기존 클라이언트가 있으면 정리
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }

    // 인증 토큰 가져오기
    let connectHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        connectHeaders['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // SockJS를 사용한 연결
    this.client = new Client({
      webSocketFactory: () => {
        return new SockJS(WS_URL) as any;
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders,
      debug: (str) => {
        // 디버그 로그 제거
      },
      onConnect: (frame) => {
        this.reconnectAttempts = 0;
        onConnect?.();
      },
      onStompError: (frame) => {
        console.error('[WebSocket] STOMP 에러:', {
          frame,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        });
        onError?.(frame);
      },
      onWebSocketClose: (event) => {
        onDisconnect?.();
        // 정상 종료가 아닌 경우에만 재연결 시도
        if (event.code !== 1000) {
          this.attemptReconnect(onConnect, onError, onDisconnect);
        }
      },
      onWebSocketError: (error) => {
        console.error('[WebSocket] 소켓 에러:', {
          error,
          sessionId: this.sessionId,
          url: WS_URL,
          timestamp: new Date().toISOString(),
        });
        onError?.(error);
      },
    });

    try {
      this.client.activate();
    } catch (error) {
      console.error('[WebSocket] 클라이언트 활성화 실패:', error);
      onError?.(error);
    }
  }

  private attemptReconnect(
    onConnect?: () => void,
    onError?: (error: any) => void,
    onDisconnect?: () => void
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 최대 재연결 시도 횟수 도달:', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        url: WS_URL,
        sessionId: this.sessionId,
      });
      console.error('[WebSocket] 서버가 실행 중인지 확인하세요:', WS_URL);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect(onConnect, onError, onDisconnect);
    }, delay);
  }

  subscribe(
    destination: string,
    callback: (message: IMessage) => void
  ): () => void {
    if (!this.client?.connected) {
      console.error('WebSocket not connected');
      return () => {};
    }

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const body = JSON.parse(message.body);
        callback({
          ...message,
          body: JSON.stringify(body),
        });
      } catch (error) {
        // JSON 파싱 실패 시 원본 body 사용
        callback(message);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  send(destination: string, body: any): void {
    if (!this.client?.connected) {
      console.error('WebSocket not connected');
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client?.connected || false;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

// 싱글톤 인스턴스 (선택적)
let wsClientInstance: WebSocketClient | null = null;

export const getWebSocketClient = (sessionId?: string): WebSocketClient => {
  if (!wsClientInstance) {
    wsClientInstance = new WebSocketClient(sessionId);
  }
  return wsClientInstance;
};

