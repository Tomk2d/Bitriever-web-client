'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { setUser, setUserFromAuthResponse } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/services/authService';
import { assetService } from '@/features/asset/services/assetService';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const code = searchParams.get('code');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const nickname = searchParams.get('nickname');
    const requiresNickname = searchParams.get('requiresNickname') === 'true';

    if (!code) {
      router.push('/login?error=인증 코드를 받지 못했습니다.');
      return;
    }

    // code로 access token 발급 (refresh token은 쿠키로 설정됨)
    fetch('/api/auth/oauth/token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (!result.data) {
          router.push('/login?error=토큰 발급에 실패했습니다.');
          return;
        }
        const authData = result.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', authData.accessToken);
        }

        if (authData.requiresNickname) {
          router.push('/auth/set-nickname');
          return;
        }

        if (authData.userId && authData.email) {
          dispatch(setUserFromAuthResponse({
            userId: authData.userId,
            email: authData.email,
            nickname: authData.nickname ?? '',
            profileUrl: authData.profileUrl ?? '',
          }));

          authService.getCurrentUser()
            .then((userData) => {
              dispatch(setUser({
                userId: userData.id,
                email: userData.email,
                nickname: userData.nickname,
                profileUrl: userData.profileUrl ?? null,
                connectedExchanges: userData.connectedExchanges || [],
              }));
              if (userData.isConnectExchange === true &&
                  userData.connectedExchanges &&
                  userData.connectedExchanges.length > 0) {
                assetService.syncAssets().catch((error) => {
                  console.error('자산 동기화 실패:', error);
                });
              }
            })
            .catch((error) => {
              console.error('사용자 정보 조회 실패:', error);
            });
        }

        router.push('/');
      })
      .catch(() => {
        router.push('/login?error=토큰 발급에 실패했습니다.');
      });
  }, [searchParams, router, dispatch]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}>
      <div>로그인 처리 중...</div>
    </div>
  );
}
