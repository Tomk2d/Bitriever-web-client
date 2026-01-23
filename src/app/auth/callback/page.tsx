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
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const nickname = searchParams.get('nickname');
    const requiresNickname = searchParams.get('requiresNickname') === 'true';

    if (!accessToken || !refreshToken) {
      router.push('/login?error=토큰을 받지 못했습니다.');
      return;
    }

    // 토큰을 localStorage에 저장
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // 닉네임 설정이 필요한 경우 닉네임 설정 화면으로 리다이렉트
    if (requiresNickname) {
      router.push('/auth/set-nickname');
      return;
    }

    // Redux에 사용자 정보 저장
    if (userId && email) {
      dispatch(setUserFromAuthResponse({
        userId,
        email,
        nickname: nickname || '',
      }));

      // 전체 사용자 정보 가져오기
      authService.getCurrentUser()
        .then((userData) => {
          // Redux에 전체 사용자 정보 저장
          dispatch(setUser({
            userId: userData.id,
            email: userData.email,
            nickname: userData.nickname,
            connectedExchanges: userData.connectedExchanges || [],
          }));
          
          // 자산 동기화 (is_connect_exchange가 true이고 connected_exchanges가 null이 아닐 때만)
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
          // 실패해도 기본 정보는 이미 저장되어 있으므로 계속 진행
        });
    }

    // 메인 페이지로 리다이렉트
    router.push('/');
  }, [searchParams, router, dispatch]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>로그인 처리 중...</div>
    </div>
  );
}
