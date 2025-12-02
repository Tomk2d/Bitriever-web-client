import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, WebSocketMessage } from '@/lib/websocket';
import { IMessage } from '@stomp/stompjs';

interface UseWebSocketOptions {
  sessionId?: string;
  destinations?: string[];
  onMessage?: (message: IMessage) => void;
  onConnect?: () => void;
  onError?: (error: any) => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const {
    sessionId,
    destinations = [],
    onMessage,
    onConnect,
    onError,
    onDisconnect,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<any>(null);
  const clientRef = useRef<WebSocketClient | null>(null);
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  const connect = useCallback(() => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    const client = new WebSocketClient(sessionId || undefined);
    clientRef.current = client;

    client.connect(
      () => {
        setIsConnected(true);
        setError(null);
        onConnect?.();

        // 모든 destination 구독
        destinations.forEach((destination) => {
          const unsubscribe = client.subscribe(destination, (message) => {
            onMessage?.(message);
          });
          unsubscribeRefs.current.push(unsubscribe);
        });
      },
      (err) => {
        setError(err);
        setIsConnected(false);
        onError?.(err);
      },
      () => {
        setIsConnected(false);
        onDisconnect?.();
      }
    );
  }, [sessionId, destinations, onMessage, onConnect, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    unsubscribeRefs.current.forEach((unsubscribe) => unsubscribe());
    unsubscribeRefs.current = [];
    clientRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  const send = useCallback((destination: string, body: any) => {
    clientRef.current?.send(destination, body);
  }, []);

  const subscribe = useCallback(
    (destination: string, callback: (message: IMessage) => void) => {
      if (!clientRef.current?.isConnected()) {
        console.error('WebSocket not connected');
        return () => {};
      }

      const unsubscribe = clientRef.current.subscribe(destination, callback);
      unsubscribeRefs.current.push(unsubscribe);
      return unsubscribe;
    },
    []
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]); // connect, disconnect는 안정적인 함수이므로 dependency에서 제외

  return {
    isConnected,
    error,
    connect,
    disconnect,
    send,
    subscribe,
  };
};


