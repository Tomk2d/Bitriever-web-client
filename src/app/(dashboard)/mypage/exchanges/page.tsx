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

/** 거래소별 API 키 생성 페이지 URL (UPBIT, BITHUMB, COINONE) */
const API_KEY_URL_BY_EXCHANGE: Record<string, string> = {
  UPBIT: 'https://upbit.com/mypage/open_api_management',
  BITHUMB: 'https://www.bithumb.com/react/api-support/management-api',
  COINONE: 'https://coinone.co.kr/user/api/management/personal-api',
};

/** API 키 발급 안내 이미지/문구 (UPBIT, BITHUMB, COINONE만 사용) */
const API_GUIDE_BY_EXCHANGE: Record<
  string,
  { createImage: string; getImage: string; createDesc: string; getDesc: string }
> = {
  UPBIT: {
    createImage: '/exchange/upbit_api_key_create.png',
    getImage: '/exchange/upbit_api_key_get.png',
    createDesc: 'API 키 발급 페이지에서 새 API 키를 생성합니다.',
    getDesc: '해당 화면을 닫지 마시고, API Key 와 Secret Key 를 복사하여 본인만 볼 수 있는 공간에 저장하세요. 이후 아래의 입력창에 입력해주세요.',
  },
  BITHUMB: {
    createImage: '/exchange/bithumb_api_key_create.png',
    getImage: '/exchange/bithumb_api_key_get.png',
    createDesc: 'API 관리 메뉴에서 새 API 키를 발급합니다.',
    getDesc: '해당 화면을 닫지 마시고, API Key 와 Secret Key 를 복사하여 본인만 볼 수 있는 공간에 저장하세요. 이후 아래의 입력창에 입력해주세요.',
  },
  COINONE: {
    createImage: '/exchange/coinone_api_key_create.png',
    getImage: '/exchange/coinone_api_key_get.png',
    createDesc: 'API 키 발급 화면에서 새 API 키를 생성합니다.',
    getDesc: '해당 화면을 닫지 마시고, API Key 와 Secret Key 를 복사하여 본인만 볼 수 있는 공간에 저장하세요. 이후 아래의 입력창에 입력해주세요.',
  },
};

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

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [responsibilityAgreed, setResponsibilityAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  /** 1단계: 동의 팝업 항목 (기획에 따라 문구/항목 수정 가능) */
  const AGREEMENT_ITEMS = [
    { id: 'security', label: 'API 키 보안 유의사항에 동의합니다.' },
    { id: 'thirdParty', label: '제3자(거래소) 제공 및 이용에 동의합니다.' },
    { id: 'terms', label: '서비스 이용약관 및 개인정보 처리방침에 동의합니다.' },
  ] as const;
  const [agreementChecks, setAgreementChecks] = useState<Record<string, boolean>>(
    AGREEMENT_ITEMS.reduce((acc, { id }) => ({ ...acc, [id]: false }), {})
  );
  const allAgreed = AGREEMENT_ITEMS.every(({ id }) => agreementChecks[id]);
  const setAllAgreed = (value: boolean) =>
    setAgreementChecks(AGREEMENT_ITEMS.reduce((acc, { id }) => ({ ...acc, [id]: value }), {}));

  const hasWhitespaceInKeys = /\s/.test(apiKey) || /\s/.test(secretKey);
  const submitDisabled =
    !apiKey ||
    !secretKey ||
    !responsibilityAgreed ||
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
    setResponsibilityAgreed(false);
    setModalErrorMessage(null);
    setAgreementChecks(AGREEMENT_ITEMS.reduce((acc, { id }) => ({ ...acc, [id]: false }), {}));
    setShowAgreementModal(true);
  };

  const handleAgreementCancel = () => {
    setShowAgreementModal(false);
    setSelectedExchange(null);
  };

  const handleAgreementConfirm = () => {
    if (!allAgreed) return;
    setShowAgreementModal(false);
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

      {/* 1단계: 동의 팝업 */}
      {showAgreementModal && selectedExchange && (
        <div className="mypage-modal-overlay">
          <div className="mypage-modal mypage-exchange-agreement-modal">
            <h3 className="mypage-modal-title">
              {selectedExchange.koreanName} API 연동 동의
            </h3>
            <p className="mypage-exchange-agreement-desc">
              거래소 연동을 위해 아래 내용을 확인하고 동의해 주세요.
            </p>
            <div className="mypage-exchange-agreement-list">
              <label className="mypage-exchange-agreement-item mypage-exchange-agreement-item-all">
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={(e) => setAllAgreed(e.target.checked)}
                />
                <span>모두 동의</span>
              </label>
              {AGREEMENT_ITEMS.map(({ id, label }) => (
                <label key={id} className="mypage-exchange-agreement-item">
                  <input
                    type="checkbox"
                    checked={!!agreementChecks[id]}
                    onChange={(e) =>
                      setAgreementChecks((prev) => ({ ...prev, [id]: e.target.checked }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="mypage-modal-actions" style={{ marginTop: '24px' }}>
              <button
                type="button"
                className="mypage-button mypage-button-success"
                style={{ flex: 1, padding: '9px 18px' }}
                onClick={handleAgreementConfirm}
                disabled={!allAgreed}
              >
                동의하고 연동하기
              </button>
              <button
                type="button"
                className="mypage-button mypage-button-secondary"
                style={{ flex: 1, padding: '9px 18px' }}
                onClick={handleAgreementCancel}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2단계: API 키 입력 모달 */}
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
            maxWidth: '480px',
            margin: '0 20px',
          }}>
            {API_GUIDE_BY_EXCHANGE[selectedExchange.name] && (
              <div className="mypage-api-guide">
                <h4 className="mypage-api-guide-title">
                  {selectedExchange.koreanName} 거래소 키 발급 방법
                </h4>
                <div className="mypage-api-guide-scroll">
                  <div className="mypage-api-guide-step">
                    <p className="mypage-api-guide-step-desc">
                      <strong>1. {selectedExchange.koreanName} 에 로그인 합니다.</strong>
                    </p>
                  </div>
                  <div className="mypage-api-guide-step">
                    <p className="mypage-api-guide-step-desc">
                      <br />
                      <strong>2. 아래 주소에 접속하여 API 키 생성을 시작합니다.</strong>
                    </p>
                    {API_KEY_URL_BY_EXCHANGE[selectedExchange.name] && (
                      <p className="mypage-api-guide-step-desc">
                        <a
                          href={API_KEY_URL_BY_EXCHANGE[selectedExchange.name]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mypage-api-guide-link"
                        >
                          {API_KEY_URL_BY_EXCHANGE[selectedExchange.name]}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="mypage-api-guide-step">
                    <p className="mypage-api-guide-step-desc">
                      <br />
                      <strong>3. {API_GUIDE_BY_EXCHANGE[selectedExchange.name].createDesc}</strong>
                    </p>
                    <p className="mypage-api-guide-step-warning">
                      절대 거래 기능이나 입금, 출금하기 기능을 체크하지 않아야 합니다.
                    </p>
                    <img
                      src={API_GUIDE_BY_EXCHANGE[selectedExchange.name].createImage}
                      alt="API 키 발급 화면"
                    />
                    <p className="mypage-api-guide-step-caption">API 키 발급/생성 화면</p>
                  </div>
                  <div className="mypage-api-guide-step">
                    <p className="mypage-api-guide-step-desc">
                      <br />
                      <strong>4. {API_GUIDE_BY_EXCHANGE[selectedExchange.name].getDesc}</strong>
                    </p>
                    <img
                      src={API_GUIDE_BY_EXCHANGE[selectedExchange.name].getImage}
                      alt="API 키 확인 화면"
                    />
                    <p className="mypage-api-guide-step-caption">API 키 확인/복사 화면</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mypage-api-key-fields">
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
            </div>

            <label className="mypage-api-responsibility-check">
              <input
                type="checkbox"
                checked={responsibilityAgreed}
                onChange={(e) => setResponsibilityAgreed(e.target.checked)}
              />
              <span>거래하기, 입금, 출금 기능을 체크하지 않았다면 체크해주세요.<br />사용자의 부주의로 인한 손실은 책임지지 않습니다.</span>
            </label>

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
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
