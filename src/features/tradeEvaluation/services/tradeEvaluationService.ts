import { apiClient } from '@/lib/axios';
import type {
  TradeEvaluationRequestDto,
  TradeEvaluationStatusResponse,
} from '../types';

/** ApiResponse 래퍼 (서버와 동일 구조) */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3분

/**
 * 매매 분석 요청 또는 결과 조회.
 * - 200: 분석 완료, data 반환
 * - 202: 분석 진행 중
 */
export async function requestTradeEvaluation(
  body: TradeEvaluationRequestDto
): Promise<{ status: number; data: TradeEvaluationStatusResponse }> {
  const response = await apiClient.post<ApiResponse<TradeEvaluationStatusResponse>>(
    '/api/trade-evaluation/request',
    body
  );
  const payload = response.data?.data;
  if (!payload) {
    throw new Error(response.data?.message || '매매 분석 요청에 실패했습니다.');
  }
  return { status: response.status, data: payload };
}

/**
 * 분석 완료될 때까지 폴링 후 결과 반환.
 * 202가 연속으로 올 경우 interval마다 재요청하여 200이 오면 resolve.
 */
export function requestTradeEvaluationWithPolling(
  body: TradeEvaluationRequestDto,
  onProgress?: () => void
): Promise<TradeEvaluationStatusResponse> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const poll = async () => {
      try {
        const { status, data } = await requestTradeEvaluation(body);
        if (status === 200 && data.status === 'COMPLETED' && data.result != null) {
          resolve(data);
          return;
        }
        if (status === 202) {
          onProgress?.();
          attempts += 1;
          if (attempts >= MAX_POLL_ATTEMPTS) {
            reject(new Error('분석이 시간 초과되었습니다. 잠시 후 다시 시도해주세요.'));
            return;
          }
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        reject(new Error(data?.result ? '알 수 없는 응답입니다.' : '분석에 실패했습니다.'));
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}
