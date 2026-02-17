/**
 * 문의 API 서비스.
 * content는 textarea 값 그대로 전송되며, 줄바꿈(\n)은 JSON 내 문자열에 포함되어 서버에 전달됩니다.
 */
import { authenticatedFetch } from '@/lib/authenticatedFetch';

export interface InquiryCreateRequest {
  /** 문의 내용 (줄바꿈 포함) */
  content: string;
}

export interface InquiryResponse {
  id: number;
  content: string;
  status: string;
  createdAt: string;
}

export const inquiryService = {
  create: async (data: InquiryCreateRequest): Promise<InquiryResponse> => {
    const response = await authenticatedFetch('/api/proxy/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage =
        result?.error?.message ??
        result?.message ??
        (typeof result?.error === 'string' ? result.error : null) ??
        '문의 접수에 실패했습니다.';
      throw new Error(errorMessage);
    }

    return result.data ?? result;
  },
};
