import { useQuery } from '@tanstack/react-query';
import { articleService, ArticleResponse, PageResponse } from '../services/articleService';

/** fetch-server 블록미디어 기사 크롤링 주기(10분)와 동일 */
const ARTICLE_CRAWL_INTERVAL_MS = 10 * 60 * 1000;

export const useLatestArticles = (page: number = 0) => {
  return useQuery<PageResponse<ArticleResponse>>({
    queryKey: ['articles', 'latest', page],
    queryFn: () => articleService.getLatestArticles(page, 10),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchInterval: ARTICLE_CRAWL_INTERVAL_MS, // 10분마다 크롤링 주기와 맞춰 재조회
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
      // date는 "YYYY-MM-DD" 형식이므로 직접 파싱하여 로컬 타임존 기준으로 설정
      const [year, month, day] = date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0); // 로컬 타임존 기준
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999); // 로컬 타임존 기준

      // ISO 8601 형식으로 변환: "2024-01-01T00:00:00"
      // 로컬 타임존을 유지하기 위해 수동으로 포맷팅
      const formatLocalDateTime = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      const startDateStr = formatLocalDateTime(startDate);
      const endDateStr = formatLocalDateTime(endDate);

      return articleService.getArticlesByDateRange(startDateStr, endDateStr, page, 10);
    },
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchInterval: ARTICLE_CRAWL_INTERVAL_MS, // 10분마다 크롤링 주기와 맞춰 재조회
  });
};

