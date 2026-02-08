import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 보호된 라우트 목록
const protectedRoutes = ['/diaries', '/trading', '/coins'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 보호된 라우트 체크
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // 인증 쿠키 체크 (실제로는 JWT 토큰 검증 필요)
  const authToken = request.cookies.get('authToken');

  if (isProtectedRoute && !authToken) {
    // 로그인 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

