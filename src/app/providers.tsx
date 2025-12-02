'use client';

import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/lib/redux';
import { queryClient } from '@/lib/react-query';
import { WebSocketProvider } from '@/shared/components/WebSocketProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </Provider>
  );
}

