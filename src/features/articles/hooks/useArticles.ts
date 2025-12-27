import { useQuery } from '@tanstack/react-query';
import { articleService, ArticleResponse, PageResponse } from '../services/articleService';

export const useLatestArticles = (page: number = 0) => {
  return useQuery<PageResponse<ArticleResponse>>({
    queryKey: ['articles', 'latest', page],
    queryFn: () => articleService.getLatestArticles(page, 10),
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useArticlesByDateRange = (date: string | null, page: number = 0) => {
  return useQuery<PageResponse<ArticleResponse>>({
    queryKey: ['articles', 'date-range', date, page],
    queryFn: async () => {
      if (!date) {
        // 날짜가 null이면 최신 기사 조회
        return articleService.getLatestArticles(page, 10);
      }

      // 날짜가 있으면 해당 날짜의 하루 범위로 조회
      const selectedDate = new Date(date);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      // ISO 8601 형식으로 변환: "2024-01-01T00:00:00"
      const startDateStr = startDate.toISOString().slice(0, 19);
      const endDateStr = endDate.toISOString().slice(0, 19);

      return articleService.getArticlesByDateRange(startDateStr, endDateStr, page, 10);
    },
    enabled: true, // 항상 활성화 (date가 null이어도 최신 기사 조회)
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

