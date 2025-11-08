import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { UserResponse } from '../types';

export const useCurrentUser = (enabled: boolean = true) => {
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false;

  return useQuery<UserResponse>({
    queryKey: ['current-user'],
    queryFn: async () => {
      return authService.getCurrentUser();
    },
    enabled: hasToken && enabled,
    staleTime: 1000 * 60 * 5, // 5분
  });
};

