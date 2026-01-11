'use client';

import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/lib/redux';
import { queryClient } from '@/lib/react-query';
import { WebSocketProvider } from '@/shared/components/WebSocketProvider';
import CalendarPreloader from '@/shared/components/CalendarPreloader';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <CalendarPreloader />
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </Provider>
  );
}

