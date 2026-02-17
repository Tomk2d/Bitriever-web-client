/** 매매 분석 작업 상태 (서버 enum과 동일) */
export type TradeEvaluationJobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

/** 매매 분석 요청 body */
export interface TradeEvaluationRequestDto {
  tradeId: number;
  targetDate: string; // YYYY-MM-DD
  coinId: number;
}

/** 매매 분석 상태/결과 응답 */
export interface TradeEvaluationStatusResponse {
  status: TradeEvaluationJobStatus;
  result?: Record<string, unknown> | null;
}
