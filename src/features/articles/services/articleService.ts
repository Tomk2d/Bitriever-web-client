import { authenticatedFetch } from '@/lib/authenticatedFetch';

export interface ArticleResponse {
  id: number;
  articleId: number;
  headline: string;
  summary: string;
  originalUrl: string;
  reporterName: string;
  publisherName: string;
  publisherType: number;
  publishedAt: string; // ISO 8601 형식
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const articleService = {
  getLatestArticles: async (page: number = 0, size: number = 10): Promise<PageResponse<ArticleResponse>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'publishedAt',
      direction: 'DESC',
    });

    const response = await authenticatedFetch(`/api/proxy/articles/latest?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[articleService] Error:', result);
      throw new Error(result.message || result.error?.message || '최신 기사 조회에 실패했습니다.');
    }

    return result.data || { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
  },

  getArticlesByDateRange: async (
    startDate: string,
    endDate: string,
    page: number = 0,
    size: number = 10
  ): Promise<PageResponse<ArticleResponse>> => {
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: page.toString(),
      size: size.toString(),
      sort: 'publishedAt',
      direction: 'DESC',
    });

    const response = await authenticatedFetch(`/api/proxy/articles/date-range?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[articleService] Error:', result);
      throw new Error(result.message || result.error?.message || '날짜 범위별 기사 조회에 실패했습니다.');
    }

    return result.data || { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
  },
};

