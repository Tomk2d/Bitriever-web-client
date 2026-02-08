import { apiClient } from '@/lib/axios';

// app-server 의 ExchangeCredentialRequest / Response 스키마에 맞춘 타입
export interface ExchangeCredentialResponse {
  userId: string;
  exchangeProvider: number;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface ExchangeCredentialRequest {
  /** 거래소 타입 코드 (1:업비트, 2:빗썸, 3:코인원, 11:바이낸스, 12:바이빗 등) */
  exchangeProvider: number;
  accessKey: string;
  secretKey: string;
}

/** 비동기 등록 시작 시 202 응답으로 받는 job 정보 */
export interface RegisterAndSyncStartResponse {
  job_id: string;
}

/** 폴링으로 조회하는 등록·연동 상태 */
export type RegisterStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface RegisterAndSyncStatusResponse {
  status: RegisterStatus;
  userId?: string;
  exchangeProvider?: number;
  exchangeName?: string;
  result?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
  message?: string;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120000;

export const exchangeService = {
  getAll: async (): Promise<ExchangeCredentialResponse[]> => {
    const response = await apiClient.get('/api/exchange-credentials');
    return response.data.data;
  },

  /**
   * 거래소 자격인증 등록 및 연동 시작. 202 + job_id 반환.
   * 결과는 getRegisterStatus로 폴링하여 확인.
   */
  create: async (data: ExchangeCredentialRequest): Promise<RegisterAndSyncStartResponse> => {
    const response = await apiClient.post('/api/exchange-credentials', data);
    // 202 Accepted: response.data.data === { job_id }
    return response.data.data as RegisterAndSyncStartResponse;
  },

  /**
   * 등록·연동 작업 상태 조회 (폴링용).
   */
  getRegisterStatus: async (jobId: string): Promise<RegisterAndSyncStatusResponse> => {
    const response = await apiClient.get('/api/exchange-credentials/register-status', {
      params: { job_id: jobId },
    });
    return response.data.data as RegisterAndSyncStatusResponse;
  },

  /**
   * job_id로 SUCCESS 또는 FAILED가 나올 때까지 폴링. 타임아웃 시 null 반환.
   */
  pollUntilComplete: async (
    jobId: string,
    onProgress?: (status: RegisterAndSyncStatusResponse) => void
  ): Promise<RegisterAndSyncStatusResponse | null> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const status = await exchangeService.getRegisterStatus(jobId);
      onProgress?.(status);
      if (status.status === 'SUCCESS' || status.status === 'FAILED') {
        return status;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    return null;
  },

  delete: async (exchangeProvider: number): Promise<void> => {
    await apiClient.delete('/api/exchange-credentials', {
      params: { exchangeProvider },
    });
  },
};

