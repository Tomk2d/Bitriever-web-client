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

export const useMyPosts = (page: number = 0, size: number = 10, enabled: boolean = true) => {
  return useQuery<PageResponse<CommunityListResponse>>({
    queryKey: ['communities', 'my', page, size],
    queryFn: () => communityService.getMyPosts(page, size),
    staleTime: 1000 * 30,
    enabled,
  });
};
