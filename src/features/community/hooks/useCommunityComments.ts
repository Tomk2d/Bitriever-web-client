import { useQuery } from '@tanstack/react-query';
import { communityCommentService } from '../services/communityCommentService';
import type { PageResponse, CommunityCommentResponse } from '../types';

export const useCommunityComments = (communityId: number | null, page: number = 0, size: number = 20) => {
  return useQuery<PageResponse<CommunityCommentResponse>>({
    queryKey: ['community-comments', communityId, page, size],
    queryFn: () => {
      if (!communityId) {
        throw new Error('Community ID is required');
      }
      return communityCommentService.getComments(communityId, page, size);
    },
    enabled: !!communityId,
    staleTime: 1000 * 30, // 30초
  });
};
