import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.APP_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    
    // Authorization 헤더 가져오기
    const authHeader = request.headers.get('Authorization');
    
    // 요청 바디 읽기 (logout의 경우 body가 없을 수 있음)
    let body: any = null;
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // body가 없는 경우 무시
        body = null;
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/${path}`, fetchOptions);

    const data = await response.json();

    if (response.ok) {
      const nextResponse = NextResponse.json(data);
      return nextResponse;
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const token = request.cookies.get('authToken')?.value;

    // Query parameter 추출
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = queryString 
      ? `${BACKEND_URL}/api/auth/${path}?${queryString}`
      : `${BACKEND_URL}/api/auth/${path}`;

    // Authorization 헤더 가져오기 (쿠키보다 우선)
    const authHeader = request.headers.get('Authorization');

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

