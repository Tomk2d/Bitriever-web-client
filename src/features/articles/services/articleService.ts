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
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'publishedAt',
      direction: 'DESC',
    });

    const response = await fetch(`/api/proxy/articles/latest?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('최신 기사 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

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
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const params = new URLSearchParams({
      startDate,
      endDate,
      page: page.toString(),
      size: size.toString(),
      sort: 'publishedAt',
      direction: 'DESC',
    });

    const response = await fetch(`/api/proxy/articles/date-range?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
    });

    if (response.status === 401) {
      console.warn('날짜 범위별 기사 조회: 인증 실패 (401) - 로그아웃 처리');
      const { authService } = await import('@/features/auth/services/authService');
      await authService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('인증에 실패했습니다.');
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('[articleService] Error:', result);
      throw new Error(result.message || result.error?.message || '날짜 범위별 기사 조회에 실패했습니다.');
    }

    return result.data || { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };
  },
};

