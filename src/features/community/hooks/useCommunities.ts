import { useQuery } from '@tanstack/react-query';
import { communityService } from '../services/communityService';
import type { PageResponse, CommunityListResponse } from '../types';

export const useCommunities = (category?: string, page: number = 0, size: number = 20) => {
  return useQuery<PageResponse<CommunityListResponse>>({
    queryKey: ['communities', category, page, size],
    queryFn: () => communityService.getAll(category, page, size),
    staleTime: 1000 * 30, // 30초
  });
};
