import { useQuery } from '@tanstack/react-query';
import { communityService } from '../services/communityService';
import type { CommunityResponse } from '../types';

export const useCommunity = (id: number | null) => {
  return useQuery<CommunityResponse>({
    queryKey: ['community', id],
    queryFn: () => {
      if (!id) {
        throw new Error('Community ID is required');
      }
      return communityService.getById(id);
    },
    enabled: !!id,
    staleTime: 1000 * 30, // 30초
  });
};
