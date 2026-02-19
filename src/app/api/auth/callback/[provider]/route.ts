import { getBackendUrl } from '@/lib/env';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    
    // 에러 처리
    const error = searchParams.get('error');
    if (error) {
      const errorMessage = searchParams.get('message') || 'OAuth2 인증에 실패했습니다.';
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }
    
    // 카카오가 클라이언트로 리다이렉트한 경우 (인증 코드 포함)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state) {
      const serverCallbackUrl = `${getBackendUrl()}/login/oauth2/code/${provider}?code=${code}&state=${state}`;
      return NextResponse.redirect(serverCallbackUrl);
    }
    
    // 백엔드 OAuth2 성공 후 code와 사용자 정보만 쿼리로 전달된 경우
    const oauthCode = searchParams.get('code');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const nickname = searchParams.get('nickname');
    const requiresNickname = searchParams.get('requiresNickname');
    
    if (!oauthCode) {
      return NextResponse.redirect(
        new URL('/login?error=인증 코드를 받지 못했습니다.', request.url)
      );
    }
    
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('code', oauthCode);
    if (userId) redirectUrl.searchParams.set('userId', userId);
    if (email) redirectUrl.searchParams.set('email', email);
    if (nickname) redirectUrl.searchParams.set('nickname', nickname);
    if (requiresNickname) redirectUrl.searchParams.set('requiresNickname', requiresNickname);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    return NextResponse.redirect(
      new URL('/login?error=인증 처리 중 오류가 발생했습니다.', request.url)
    );
  }
}
