'use client';

import { useState } from 'react';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { IMessage } from '@stomp/stompjs';

export default function WebSocketTest() {
  const [sessionId, setSessionId] = useState<string>('482c3e80-9d00-4bc9-99d7-5641921fa9c1');
  const [messages, setMessages] = useState<Array<{ time: string; topic: string; data: any }>>([]);
  const [customDestination, setCustomDestination] = useState<string>('/topic/coins/all');

  const { isConnected, error, connect, disconnect, send, subscribe } = useWebSocket({
    sessionId,
    destinations: ['/topic/coins/all'], // 모든 코인 주가 리스트를 한 번에 받는 토픽
    onMessage: (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        // 서버에서 모든 코인 리스트를 배열로 전송
        // data는 CoinTickerPriceDto[] 형태의 배열
        if (Array.isArray(data)) {
          const coinCount = data.length;
          const krwCoins = data.filter((coin: any) => coin.market?.startsWith('KRW-'));
          const btcCoins = data.filter((coin: any) => coin.market?.startsWith('BTC-'));
          const usdtCoins = data.filter((coin: any) => coin.market?.startsWith('USDT-'));
          
          // 샘플 코인 데이터 (최대 5개)
          const sampleCoins = data.slice(0, 5).map((coin: any) => ({
            market: coin.market,
            tradePrice: coin.tradePrice,
            timestamp: coin.timestamp,
          }));
          
          console.log('[WebSocketTest] 코인 주가 데이터 수신:', {
            전체코인수: coinCount,
            'KRW마켓': krwCoins.length,
            'BTC마켓': btcCoins.length,
            'USDT마켓': usdtCoins.length,
            샘플데이터: sampleCoins,
          });
          
          // 전체 데이터를 콘솔에 출력
          console.log('[WebSocketTest] 전체 코인 데이터:', data);
          console.log('[WebSocketTest] KRW 마켓 데이터:', krwCoins);
          if (btcCoins.length > 0) {
            console.log('[WebSocketTest] BTC 마켓 데이터:', btcCoins);
          }
          if (usdtCoins.length > 0) {
            console.log('[WebSocketTest] USDT 마켓 데이터:', usdtCoins);
          }
          
          setMessages((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              topic: message.headers.destination || 'unknown',
              data: {
                전체코인수: coinCount,
                'KRW마켓': krwCoins.length,
                'BTC마켓': btcCoins.length,
                'USDT마켓': usdtCoins.length,
                샘플데이터: sampleCoins,
                전체데이터: data, // 전체 데이터 포함
              },
            },
            ...prev.slice(0, 49), // 최대 50개 메시지 유지
          ]);
        } else {
          setMessages((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              topic: message.headers.destination || 'unknown',
              data: data,
            },
            ...prev.slice(0, 49),
          ]);
        }
      } catch (e) {
        console.error('[WebSocketTest] 메시지 파싱 에러:', e);
        setMessages((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            topic: message.headers.destination || 'unknown',
            data: { error: 'JSON 파싱 실패', body: message.body },
          },
          ...prev.slice(0, 49),
        ]);
      }
    },
    onConnect: () => {
      console.log('WebSocket connected with session ID:', sessionId);
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
    },
    autoConnect: false, // 수동 연결
  });

  const handleSubscribe = () => {
    if (customDestination) {
      subscribe(customDestination, (message) => {
        try {
          const data = JSON.parse(message.body);
          setMessages((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              topic: message.headers.destination || customDestination,
              data,
            },
            ...prev.slice(0, 49),
          ]);
        } catch (e) {
          setMessages((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              topic: message.headers.destination || customDestination,
              data: message.body,
            },
            ...prev.slice(0, 49),
          ]);
        }
      });
    }
  };

  const handleSendSubscribe = () => {
    send('/app/coins/subscribe', { sessionId });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>WebSocket 연결 테스트</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Session ID:
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '400px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          구독할 토픽:
          <input
            type="text"
            value={customDestination}
            onChange={(e) => setCustomDestination(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            placeholder="/topic/coins/all"
          />
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
          현재 활성화: /topic/coins/all (모든 코인 리스트 브로드캐스팅)
          {/* 멀티캐스팅 토픽들은 주석처리됨: /topic/coins/quote/KRW, /topic/coins/quote/BTC, /topic/coins/quote/USDT */}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={isConnected ? disconnect : connect}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: isConnected ? '#ff4444' : '#44ff44',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isConnected ? '연결 해제' : '연결'}
        </button>

        <button
          onClick={handleSubscribe}
          disabled={!isConnected}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: isConnected ? '#4444ff' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          커스텀 토픽 구독
        </button>

        <button
          onClick={handleSendSubscribe}
          disabled={!isConnected}
          style={{
            padding: '10px 20px',
            backgroundColor: isConnected ? '#ff8844' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
          }}
        >
          구독 신청 메시지 전송
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>상태:</strong>{' '}
        <span style={{ color: isConnected ? 'green' : 'red' }}>
          {isConnected ? '연결됨' : '연결 안 됨'}
        </span>
        {error && (
          <span style={{ color: 'red', marginLeft: '10px' }}>
            에러: {JSON.stringify(error)}
          </span>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>수신된 메시지 ({messages.length})</h3>
        <div
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            maxHeight: '400px',
            overflowY: 'auto',
            backgroundColor: '#f5f5f5',
          }}
        >
          {messages.length === 0 ? (
            <div style={{ color: '#999' }}>메시지가 없습니다.</div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  [{msg.time}] {msg.topic}
                </div>
                <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(msg.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


