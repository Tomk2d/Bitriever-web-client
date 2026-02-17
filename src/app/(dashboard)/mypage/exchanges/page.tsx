'use client';

import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { exchangeService } from '@/features/exchange/services/exchangeService';
import { authService } from '@/features/auth/services/authService';
import { setUser } from '@/store/slices/authSlice';
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
    isAvailable: true, // 빗썸도 연동 가능
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
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const connectedExchanges = user?.connectedExchanges || [];

  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const hasWhitespaceInKeys = /\s/.test(apiKey) || /\s/.test(secretKey);
  const submitDisabled =
    !apiKey ||
    !secretKey ||
    isSubmitting ||
    hasWhitespaceInKeys ||
    !!modalErrorMessage;

  const isExchangeConnected = (exchangeName: string) => {
    return connectedExchanges.some(
      (ex) => ex.name.toLowerCase() === exchangeName.toLowerCase()
    );
  };

  const handleConnect = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setApiKey('');
    setSecretKey('');
    setModalErrorMessage(null);
    setShowApiModal(true);
  };

  const handleDisconnect = async (exchange: Exchange) => {
    // TODO: 거래소 연동 해제 API 호출
    alert(`${exchange.koreanName} 연동 해제 기능은 준비 중입니다.`);
  };

  const handleSubmitApi = async () => {
    if (!selectedExchange || !apiKey || !secretKey) return;
    setIsSubmitting(true);
    setModalErrorMessage(null);
    setPollingMessage('등록 및 연동을 시작했습니다...');
    try {
      const data = await exchangeService.create({
        exchangeProvider: selectedExchange.code,
        accessKey: apiKey,
        secretKey,
      });
      const jobId = data.job_id ?? (data as { jobId?: string }).jobId;
      if (!jobId) {
        throw new Error('서버에서 job_id를 받지 못했습니다.');
      }

      setPollingMessage('자산·매매내역 연동 중... (잠시만 기다려 주세요)');

      const result = await exchangeService.pollUntilComplete(jobId, (status) => {
        if (status.status === 'PROCESSING') {
          setPollingMessage('자산·매매내역 연동 중... (잠시만 기다려 주세요)');
        }
      });

      if (result === null) {
        alert('처리 시간이 초과되었습니다. 잠시 후 연동된 거래소 목록을 확인해 주세요.');
        setShowApiModal(false);
        const userData = await authService.getCurrentUser();
        dispatch(setUser({
          userId: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          profileUrl: userData.profileUrl ?? null,
          connectedExchanges: userData.connectedExchanges || [],
        }));
        return;
      }

      if (result.status === 'SUCCESS') {
        const userData = await authService.getCurrentUser();
        dispatch(setUser({
          userId: userData.id,
          email: userData.email,
          nickname: userData.nickname,
          profileUrl: userData.profileUrl ?? null,
          connectedExchanges: userData.connectedExchanges || [],
        }));
        alert(`${selectedExchange.koreanName} 거래소가 성공적으로 연동되었습니다.`);
        setShowApiModal(false);
      } else {
        const message = result.message ?? result.error ?? '연동 실패로 등록이 취소되었습니다.';
        setPollingMessage(null);
        setModalErrorMessage(message);
      }
    } catch (error: unknown) {
      console.error('거래소 연동 실패:', error);
      const err = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = err?.response?.status;
      const message = err?.response?.data?.message ?? err?.message ?? 'API 키를 다시 확인해 주세요.';
      setPollingMessage(null);
      if (status === 401) {
        setModalErrorMessage('올바르지 않은 API Key 나 Secret Key 입니다. 확인 후 재시도 해주세요.');
      } else {
        setModalErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
      setPollingMessage(null);
    }
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
                className="mypage-button mypage-button-connected-badge"
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  backgroundColor: '#28c97a',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'default',
                }}
                disabled
              >
                연동중
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
                className="mypage-button mypage-button-success"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                onClick={() => handleConnect(exchange)}
              >
                연동하기
              </button>
            ) : (
              <button
                className="mypage-button mypage-button-ghost"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '13px',
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
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (modalErrorMessage) setModalErrorMessage(null);
                }}
                placeholder="API Key를 입력하세요"
              />
            </div>

            <div className="mypage-form-group">
              <label className="mypage-form-label">Secret Key</label>
              <input
                type="password"
                className="mypage-form-input"
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  if (modalErrorMessage) setModalErrorMessage(null);
                }}
                placeholder="Secret Key를 입력하세요"
              />
            </div>

            {pollingMessage && (
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--muted)' }}>
                {pollingMessage}
              </p>
            )}
            {hasWhitespaceInKeys && (
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--destructive, #dc2626)' }}>
                key 에는 공백이 포함될 수 없습니다.
              </p>
            )}
            {modalErrorMessage && (
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--destructive, #dc2626)' }}>
                {modalErrorMessage}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="mypage-button mypage-button-success"
                style={{ flex: 1, padding: '9px 18px' }}
                onClick={handleSubmitApi}
                disabled={submitDisabled}
              >
                {isSubmitting ? '연동 중...' : '연동하기'}
              </button>
              <button
                className="mypage-button mypage-button-secondary"
                style={{ flex: 1, padding: '9px 18px' }}
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
