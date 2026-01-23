import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    
    // 서버의 OAuth2 인증 URL로 리다이렉트
    const oauth2Url = `${BACKEND_URL}/oauth2/authorization/${provider}`;
    
    return NextResponse.redirect(oauth2Url);
  } catch (error) {
    console.error('OAuth2 redirect error:', error);
    return NextResponse.redirect(
      new URL('/login?error=OAuth2 인증 시작에 실패했습니다.', request.url)
    );
  }
}
