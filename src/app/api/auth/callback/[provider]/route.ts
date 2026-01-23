import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

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
      // 인증 코드를 서버로 전달 (서버의 OAuth2 callback 엔드포인트로 리다이렉트)
      const serverCallbackUrl = `${BACKEND_URL}/login/oauth2/code/${provider}?code=${code}&state=${state}`;
      return NextResponse.redirect(serverCallbackUrl);
    }
    
    // 서버에서 토큰을 받은 경우 (정상 플로우)
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const nickname = searchParams.get('nickname');
    const requiresNickname = searchParams.get('requiresNickname');
    
    if (!accessToken || !refreshToken) {
      return NextResponse.redirect(
        new URL('/login?error=토큰을 받지 못했습니다.', request.url)
      );
    }
    
    // 토큰을 쿼리 파라미터로 전달하여 클라이언트 페이지로 리다이렉트
    // 클라이언트 페이지에서 토큰을 받아서 localStorage에 저장
    const redirectUrl = new URL('/auth/callback', request.url);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
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
