'use client';

import { useEffect, useState } from 'react';
import { authService } from '@/features/auth/services/authService';
import { tokenStore } from '@/lib/tokenStore';
import { store } from '@/lib/redux';
import { clearUser } from '@/store/slices/authSlice';

export function AuthBootstrapProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await authService.refreshToken();
      } catch {
        tokenStore.clearAccessToken();
        store.dispatch(clearUser());
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        인증 상태를 확인하는 중입니다...
      </div>
    );
  }

  return <>{children}</>;
}
