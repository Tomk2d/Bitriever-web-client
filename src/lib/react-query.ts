import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

export const getQueryClient = cache(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
}));

export const queryClient = typeof window !== 'undefined' 
  ? new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5분
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    })
  : getQueryClient();

