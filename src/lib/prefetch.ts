import { QueryClient } from '@tanstack/react-query';
import { coinServerService } from '@/features/coins/services/coinServerService';
import { fearGreedServerService } from '@/features/feargreed/services/fearGreedServerService';
import { cookies } from 'next/headers';

export async function prefetchInitialData(queryClient: QueryClient) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('authToken')?.value;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['coins', 'KRW'],
      queryFn: () => coinServerService.getAllByQuoteCurrency('KRW', authToken),
      staleTime: 1000 * 60 * 60, // 1시간
    }),
    queryClient.prefetchQuery({
      queryKey: ['coins', 'BTC'],
      queryFn: () => coinServerService.getAllByQuoteCurrency('BTC', authToken),
      staleTime: 1000 * 60 * 60, // 1시간
    }),
    queryClient.prefetchQuery({
      queryKey: ['coins', 'USDT'],
      queryFn: () => coinServerService.getAllByQuoteCurrency('USDT', authToken),
      staleTime: 1000 * 60 * 60, // 1시간
    }),
    queryClient.prefetchQuery({
      queryKey: ['fearGreed', 'history'],
      queryFn: () => fearGreedServerService.getHistory(authToken),
      staleTime: 1000 * 60 * 60, // 1시간
    }),
  ]);
}

