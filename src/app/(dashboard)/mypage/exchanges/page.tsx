'use client';

import { useState } from 'react';
import { useAppSelector } from '@/store/hooks';

interface Exchange {
  code: number;
  name: string;
  koreanName: string;
  logo: string;
  isConnected: boolean;
  isAvailable: boolean;
}

const EXCHANGES: Exchange[] = [
  {
    code: 1,
    name: 'UPBIT',
    koreanName: '업비트',
    logo: '/exchanges/upbit.png',
    isConnected: false,
    isAvailable: true,
  },
  {
    code: 2,
    name: 'BITHUMB',
    koreanName: '빗썸',
    logo: '/exchanges/bithumb.png',
    isConnected: false,
    isAvailable: false,
  },
  {
    code: 3,
    name: 'COINONE',
    koreanName: '코인원',
    logo: '/exchanges/coinone.png',
    isConnected: false,
    isAvailable: true,
  },
  {
    code: 11,
    name: 'BINANCE',
    koreanName: '바이낸스',
    logo: '/exchanges/binance.png',
    isConnected: false,
    isAvailable: false,
  },
  {
    code: 12,
    name: 'BYBIT',
    koreanName: '바이비트',
    logo: '/exchanges/bybit.png',
    isConnected: false,
    isAvailable: false,
  },
];

export default function ExchangesPage() {
  const user = useAppSelector((state) => state.auth.user);
  const connectedExchanges = user?.connectedExchanges || [];

  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');

  const isExchangeConnected = (exchangeName: string) => {
    return connectedExchanges.some(
      (ex) => ex.name.toLowerCase() === exchangeName.toLowerCase()
    );
  };

  const handleConnect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setSecretKey('');
    setShowApiModal(true);
  };

  const handleDisconnect = async (exchange: Exchange) => {
    // TODO: 거래소 연동 해제 API 호출
    alert(`${exchange.koreanName} 연동 해제 기능은 준비 중입니다.`);
  };

  const handleSubmitApi = async () => {
    if (!selectedExchange || !apiKey || !secretKey) return;
    
    // TODO: 거래소 연동 API 호출
    alert(`${selectedExchange.koreanName} 연동 기능은 준비 중입니다.`);
    setShowApiModal(false);
  };

  return (
    <div className="mypage-page">
      <div className="mypage-page-header">
        <h1 className="mypage-page-title">거래소 연동</h1>
        <p className="mypage-page-description">거래소 API를 연동하여 자산과 거래 내역을 동기화할 수 있습니다.</p>
      </div>

      <div className="mypage-card">
        <h3 className="mypage-card-title">연동된 거래소</h3>
        {connectedExchanges.length === 0 ? (
          <div className="mypage-empty" style={{ padding: '40px 20px' }}>
            <div className="mypage-empty-text">연동된 거래소가 없습니다.</div>
          </div>
        ) : (
          EXCHANGES.filter((ex) => isExchangeConnected(ex.name)).map((exchange) => (
            <div key={exchange.code} className="mypage-list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 600,
                }}>
                  {exchange.koreanName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>{exchange.koreanName}</div>
                  <div style={{ fontSize: '12px', opacity: 0.5 }}>{exchange.name}</div>
                </div>
              </div>
              <button
                className="mypage-button mypage-button-secondary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => handleDisconnect(exchange)}
              >
                연동 해제
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mypage-card">
        <h3 className="mypage-card-title">연동 가능한 거래소</h3>
        {EXCHANGES.filter((ex) => !isExchangeConnected(ex.name)).map((exchange) => (
          <div key={exchange.code} className="mypage-list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 600,
              }}>
                {exchange.koreanName.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{exchange.koreanName}</div>
                <div style={{ fontSize: '12px', opacity: 0.5 }}>{exchange.name}</div>
              </div>
            </div>
            {exchange.isAvailable ? (
              <button
                className="mypage-button"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => handleConnect(exchange)}
              >
                연동하기
              </button>
            ) : (
              <button
                className="mypage-button"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px',
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
                disabled
              >
                준비중입니다
              </button>
            )}
          </div>
        ))}
      </div>

      {/* API 키 입력 모달 */}
      {showApiModal && selectedExchange && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--background)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            margin: '0 20px',
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: '18px', 
              fontWeight: 600 
            }}>
              {selectedExchange.koreanName} API 연동
            </h3>
            
            <div className="mypage-form-group">
              <label className="mypage-form-label">API Key</label>
              <input
                type="text"
                className="mypage-form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="API Key를 입력하세요"
              />
            </div>

            <div className="mypage-form-group">
              <label className="mypage-form-label">Secret Key</label>
              <input
                type="password"
                className="mypage-form-input"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Secret Key를 입력하세요"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="mypage-button"
                style={{ flex: 1 }}
                onClick={handleSubmitApi}
                disabled={!apiKey || !secretKey}
              >
                연동하기
              </button>
              <button
                className="mypage-button mypage-button-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowApiModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
