'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { IMessage } from '@stomp/stompjs';
import { coinPriceService, CoinTickerPriceDto } from '@/features/coins/services/coinPriceService';
import { setInitialPrices, updatePrices, selectIsInitialized } from '@/store/slices/coinPriceSlice';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitialized = useAppSelector(selectIsInitialized);
  const initialFetchDone = useRef(false);

  // destinations를 useMemo로 메모이제이션하여 불필요한 재생성 방지
  const destinations = useMemo(() => [
    '/topic/coins/all', // 모든 코인 주가 리스트를 한 번에 받는 토픽
    // ========== 멀티캐스팅 토픽 (주석처리) ==========
    // '/topic/coins/quote/KRW',  // KRW 마켓 개별 코인별 멀티캐스팅
    // '/topic/coins/quote/BTC',  // BTC 마켓 개별 코인별 멀티캐스팅
    // '/topic/coins/quote/USDT', // USDT 마켓 개별 코인별 멀티캐스팅
  ], []);

  // 콜백 함수들을 useCallback으로 메모이제이션하여 불필요한 재연결 방지
  const onMessage = useCallback((message: IMessage) => {
    try {
      const data = JSON.parse(message.body);
      // 서버에서 변동된 코인 리스트를 배열로 전송
      // data는 CoinTickerPriceDto[] 형태의 배열 (변동된 코인만 포함)
      if (Array.isArray(data)) {
        const coinCount = data.length;
        
        // Redux에 변동 가격 업데이트
        dispatch(updatePrices(data as CoinTickerPriceDto[]));
        
        // 시장별(KRW, BTC, USDT) 데이터 개수 로그
        if (coinCount > 0) {
          const krwCoins = data.filter((coin: any) => coin.market?.startsWith('KRW-'));
          const btcCoins = data.filter((coin: any) => coin.market?.startsWith('BTC-'));
          const usdtCoins = data.filter((coin: any) => coin.market?.startsWith('USDT-'));

          if (krwCoins.length > 0) {
            console.log(`[WebSocket] KRW 데이터 수신: ${krwCoins.length}개 코인`);
          }
          if (btcCoins.length > 0) {
            console.log(`[WebSocket] BTC 데이터 수신: ${btcCoins.length}개 코인`);
          }
          if (usdtCoins.length > 0) {
            console.log(`[WebSocket] USDT 데이터 수신: ${usdtCoins.length}개 코인`);
          }
        }
      }
    } catch (e) {
      console.error('[WebSocket] 메시지 수신 (JSON 파싱 실패):', {
        destination: message.headers.destination,
        body: message.body,
        error: e,
        timestamp: new Date().toISOString(),
      });
    }
  }, [dispatch]);

  const onConnect = useCallback(() => {
    console.log('[WebSocket] 연결됨');
    
    // WebSocket 연결 후 최초 GET 요청 실행 (거래소별로 분리하여 가져오기)
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      
      // 업비트와 코인원을 각각 가져와서 합치기
      Promise.all([
        coinPriceService.getTickerPricesByExchange('UPBIT'),
        coinPriceService.getTickerPricesByExchange('COINONE'),
      ])
        .then(([upbitPrices, coinonePrices]) => {
          // 두 거래소의 가격을 합쳐서 초기 데이터로 설정
          const allPrices = [...upbitPrices, ...coinonePrices];
          dispatch(setInitialPrices(allPrices));
        })
        .catch((error) => {
          console.error('[WebSocketProvider] 최초 가격 데이터 조회 실패:', error);
          initialFetchDone.current = false; // 실패 시 재시도 가능하도록
        });
    }
  }, [dispatch]);

  const onError = useCallback((err: any) => {
    console.error('[WebSocket] 연결 에러:', {
      error: err,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const onDisconnect = useCallback(() => {
    console.log('[WebSocket] 연결 해제됨');
  }, []);

  const { isConnected, error, subscribe } = useWebSocket({
    destinations,
    onMessage,
    onConnect,
    onError,
    onDisconnect,
    autoConnect: true,
  });

  useEffect(() => {
    if (!isConnected) {
      // 연결이 끊기면 초기화 플래그 리셋 (재연결 시 다시 GET 요청)
      if (initialFetchDone.current) {
        initialFetchDone.current = false;
      }
    }
  }, [isConnected]);

  useEffect(() => {
    if (error) {
      console.error('[WebSocket] 에러 발생:', error);
    }
  }, [error]);

  // ========== 추가 토픽 구독 예시 (멀티캐스팅 - 주석처리) ==========
  // useEffect(() => {
  //   if (isConnected) {
  //     // 특정 마켓 구독 예시 (개별 코인별 멀티캐스팅)
  //     // subscribe('/topic/coins/KRW-BTC', (message) => {
  //     //   console.log('[WebSocket] KRW-BTC 메시지:', message);
  //     // });
  //   }
  // }, [isConnected, subscribe]);

  return <>{children}</>;
}


